import { DatabaseDriver } from "../database/DatabaseDriver";
import { Replicable } from "../datastructure/Replicable";
import { Guild } from "./Guild";
import { User } from "./User";

export class GuildMember extends Replicable<Omit<WS.GuildMember, "id">> {
    readonly user: User;
    readonly guild: Guild;

    constructor(private dd: DatabaseDriver, {
        id,
        guild,
        user
    }: {
        id: Snowflake,
        guild: Guild,
        user: User
    }) {
        super(id, {
            userId: user.id
        });
        this.user = user;
        this.guild = guild;
    }
}
