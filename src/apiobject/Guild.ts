import { GuildChannel } from "./GuildChannel";
import { GuildMember } from "./GuildMember";
import { OrderedSet } from "../datastructure/OrderedSet";
import { Replicable } from "../datastructure/Replicable";
import { DatabaseDriver } from "../database/DatabaseDriver";
import { User } from "./User";

export class Guild extends Replicable<Omit<WS.Guild, "id">> {
    readonly channels: OrderedSet<GuildChannel>;
    readonly members: OrderedSet<GuildMember>;

    constructor(private dd: DatabaseDriver, {
        id,
        name
    }: {
        id: Snowflake,
        name: string
    }) {
        super(id, {
            name
        });
        this.channels = new OrderedSet((a, b) => a.data.name.localeCompare(b.data.name));
        this.members = new OrderedSet((a, b) => a.user.data.username.localeCompare(b.user.data.username));
    }

    createMember(user: User) {
        return this.dd.createGuildMember(this, user);
    }

    createChannel(name: string, position: number, topic: string | null) {
        return this.dd.createGuildChannel(name, position, topic, this);
    }
}
