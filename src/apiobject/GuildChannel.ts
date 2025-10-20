import { DatabaseDriver } from "../database/DatabaseDriver";
import { Bucket } from "../datastructure/Bucket";
import { Replicable } from "../datastructure/Replicable";
import { Guild } from "./Guild";
import { Message } from "./Message";
import { User } from "./User";

export class GuildChannel extends Replicable<Omit<WS.GuildChannel, "id">> {
    readonly guild: Guild;
    messageBucket: Bucket<Message>;

    constructor(private dd: DatabaseDriver, {
        id,
        name,
        position,
        topic,
        guild
    }: {
        id: Snowflake,
        name: string,
        position: number,
        topic: string | null,
        guild: Guild
    }) {
        super(id, {
            name,
            position,
            topic
        });
        this.guild = guild;
        this.messageBucket = new Bucket<Message>((a, b) => a.creation - b.creation);
    }

    createMessage(content: string, author: User) {
        return this.dd.createMessage(content, author, this);
    }
}
