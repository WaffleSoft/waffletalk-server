import { ApiObject } from "../apiobject";
import { Guild } from "../apiobject/Guild";
import { GuildChannel } from "../apiobject/GuildChannel";
import { GuildMember } from "../apiobject/GuildMember";
import { Message } from "../apiobject/Message";
import { User } from "../apiobject/User";
import { ReplicableMutation } from "../datastructure/Replicable";
import { EventRouter } from "../events/EventRouter";

export abstract class DatabaseDriver extends EventRouter<ReplicableMutation<ApiObject["data"]>> {
    /**
     * Flush pending operations, if any are queued.
     * Should resolve immediately if driver has no queue.
     * 
     * @resolves when queue is flushed.
     */
    abstract flush(): Promise<void>;

    abstract createGuild(name: string): Promise<Guild>;
    abstract createGuildChannel(name: string, position: number, topic: string | null, guild: Guild): Promise<GuildChannel>;
    abstract createGuildMember(guild: Guild, user: User): Promise<GuildMember>;
    abstract createMessage(content: string, author: User, channel: GuildChannel): Promise<Message>;
    abstract createUser(username: string, clienthash: string): Promise<User>;

    /**
     * Authenticate a user and generate a session token.
     * 
     * @param username
     * @param passhash SHA256(password + username) generated on client.
     * 
     * @returns X-Authorization token
     */
    abstract authenticate(username: string, passhash: string): Promise<string>;

    /**
     * Authorize a user's websocket connection using their token.
     * 
     * @param token
     * 
     * @returns authorized User instance
     */
    abstract authorize(token: string): Promise<User>;
}
