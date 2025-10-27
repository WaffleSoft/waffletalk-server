import { ClientBulkWriteModel, Db, Long, MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { DatabaseDriver } from "../DatabaseDriver";
import { Schemas } from "./Schema";
import { ReplicableMutation } from "../../datastructure/Replicable";
import { ApiObject } from "../../apiobject";
import { SnowflakeGenerator } from "../../util/snowflake";
import { User } from "../../apiobject/User";
import { Guild } from "../../apiobject/Guild";
import { GuildChannel } from "../../apiobject/GuildChannel";
import { GuildMember } from "../../apiobject/GuildMember";
import { Message } from "../../apiobject/Message";

export class MongoDBDriver extends DatabaseDriver {
    private static SchemaKey = new Map<Constructor<ApiObject>, keyof Schemas>()
        .set(Guild, "guild")
        .set(GuildChannel, "guildchannel")
        .set(GuildMember, "guildmember")
        .set(Message, "message")
        .set(User, "user");

    private queue: ClientBulkWriteModel<Schemas>[] = [];
    public readonly snowflake = SnowflakeGenerator();
    private users: Map<Snowflake, User> = new Map();

    constructor(
        private client: MongoClient,
        private db: Db = client.db("waffletalk")
    ) {
        super();
    }

    static async instantiate() {
        const cfg = JSON.parse(await readFile("/etc/waffletalk.json", "utf-8"));
        if (!("mongodb" in cfg)) throw "mongodb not configured";
        const client = new MongoClient(cfg.mongodb);
        await client.connect();
        const driver = new MongoDBDriver(client);
        for await (const userDoc of driver.collection("user").find()) {
            const id = userDoc._id.toString();
            driver.users.set(id, new User(driver, { id, username: userDoc.username }));
        }
        return driver;
    }

    async flush() {
        await this.client.bulkWrite(this.queue, { dbName: "waffletalk" });
        this.queue = [];
    }

    async createGuild(name: string) {
        const guild = new Guild(this, {
            id: this.snowflake(),
            name
        });
        await this.collection("guild").insertOne({
            _id: Long.fromStringStrict(guild.id),
            name: guild.data.name
        });
        this.addSource(guild);
        return guild;
    }

    async createGuildChannel(name: string, position: number, topic: string | null, guild: Guild) {
        const channel = new GuildChannel(this, {
            id: this.snowflake(),
            name,
            position,
            topic,
            guild
        });
        await this.collection("guildchannel").insertOne({
            _id: Long.fromStringStrict(channel.id),
            name,
            position,
            topic,
            guildId: Long.fromStringStrict(guild.id)
        });
        this.addSource(channel);
        return channel;
    }

    async createGuildMember(guild: Guild, user: User) {
        const member = new GuildMember(this, {
            id: this.snowflake(),
            guild,
            user
        });
        await this.collection("guildmember").insertOne({
            _id: Long.fromStringStrict(member.id),
            guildId: Long.fromStringStrict(guild.id),
            userId: Long.fromStringStrict(user.id)
        });
        this.addSource(member);
        return member;
    }

    async createMessage(content: string, author: User, channel: GuildChannel) {
        const message = new Message(this, {
            id: this.snowflake(),
            content,
            author,
            channel
        });
        await this.collection("message").insertOne({
            _id: Long.fromStringStrict(message.id),
            content,
            edited: null,
            authorId: Long.fromStringStrict(author.id),
            channelId: Long.fromStringStrict(channel.id)
        });
        this.addSource(message);
        return message;
    }

    async createUser(username: string, clienthash: string) {
        const user = new User(this, {
            id: this.snowflake(),
            username
        });
        await this.collection("user").insertOne({
            _id: Long.fromStringStrict(user.id),
            username,
            passhash: await bcrypt.hash(clienthash, 10)
        });
        this.addSource(user);
        return user;
    }

    on(signal: ReplicableMutation<ApiObject>) {
        super.emit(signal);
        const namespace = MongoDBDriver.SchemaKey.get(signal.replicable.constructor as Constructor<ApiObject>);
        if (namespace === undefined) return console.error("unhandled mutation event on MongoDBDriver on " + signal.replicable.constructor);
        this.queue.push({
            namespace,
            name: "updateOne",
            filter: { _id: Long.fromStringStrict(signal.replicable.id) },
            update: { $set: { [signal.property]: signal.value } }
        });
    }

    async authenticate(username: string, clienthash: string) {
        const userDoc = await this.collection("user").findOne({
            username
        });
        if (userDoc === null) throw "authentication failed";
        if (!(await bcrypt.compare(clienthash, userDoc.passhash))) throw "authentication failed";
        const token = randomBytes(32).toString("base64");
        this.collection("session").insertOne({
            _id: Long.fromStringStrict(this.snowflake()),
            userId: userDoc._id,
            token
        });
        return token;
    }

    async authorize(token: string) {
        const sessionCur = await this.collection("session").aggregate<Schemas["session"] & { users: Schemas["user"][] }>()
            .match({ token })
            .lookup({
                from: "user",
                localField: "userId",
                foreignField: "_id",
                as: "users"
            });
        const sessionDocs = await sessionCur.toArray();
        if (sessionDocs.length !== 1 || sessionDocs[0].users.length !== 1) throw "authorization failed";
        const userDoc = sessionDocs[0].users[0];
        let user = this.users.get(userDoc._id.toString());
        if (user === undefined) this.users.set(userDoc._id.toString(), user = new User(this, { id: userDoc._id.toString(), username: userDoc.username }));
        return user;
    }

    private collection<Collection extends keyof Schemas>(coll: Collection) {
        return this.db.collection<Schemas[Collection]>(coll);
    }
}
