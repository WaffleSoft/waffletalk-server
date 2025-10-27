import ws from "ws";
import { User } from "../apiobject/User";
import { SignalRouter } from "./SignalRouter";
import { SocketSignal } from "./SocketSignal";

export class Client extends SignalRouter<SocketSignal> {
    private delivered = new WeakSet<SocketSignal>();

    constructor(
        public readonly user: User,
        private socket: ws
    ) {
        super();
    }

    emit(signal: SocketSignal) {
        if (this.delivered.has(signal)) return;
        this.socket.send(signal.payload);
        this.delivered.add(signal);
    }
}
