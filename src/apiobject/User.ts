import { Client } from "../signals/Client";
import { Replicable } from "../datastructure/Replicable";
import { DatabaseDriver } from "../database/DatabaseDriver";

export class User extends Replicable<Omit<WS.User, "id">> {
    readonly clients: Set<Client>;

    constructor(private dd: DatabaseDriver, {
        id,
        username
    }: WS.User) {
        super(id, {
            username
        });
        this.clients = new Set();
    }
}
