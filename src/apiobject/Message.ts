import { DatabaseDriver } from "../database/DatabaseDriver";
import { Replicable } from "../datastructure/Replicable";
import { GuildChannel } from "./GuildChannel";
import { User } from "./User";

export class Message extends Replicable<Omit<WS.Message, "id">> {
    readonly author: User;
    readonly channel: GuildChannel;
    readonly creation: number;

    constructor(private dd: DatabaseDriver, {
        id,
        content,
        author,
        channel
    }: {
        id: Snowflake,
        content: string,
        author: User,
        channel: GuildChannel
    }) {
        super(id, {
            content,
            edited: null,
            authorId: author.id
        });
        this.author = author;
        this.channel = channel;
        this.creation = Number(BigInt(this.id) >> 22n);
    }
}
