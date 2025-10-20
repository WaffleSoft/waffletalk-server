import ws from "ws";
import { User } from "../apiobject/User";
import { EventRouter } from "./EventRouter";
import { ClientEvent } from "./ClientEvent";

export class Client extends EventRouter<ClientEvent> {
    readonly user: User;
    private socket: ws;

    constructor({ user, socket }: { user: User, socket: ws }) {
        super();
        this.user = user;
        this.socket = socket;
    }

    emit(event: ClientEvent) {
        super.emit(event);
        if (event.delivered.has(this)) return;
        this.socket.send(event.payload);
        event.delivered.add(this);
    }
}
