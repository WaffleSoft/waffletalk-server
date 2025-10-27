import { Client } from "./Client";

export abstract class SocketSignal<EventName extends keyof WS.Events = keyof WS.Events> {
    private json: string | null;
    readonly delivered: Set<Client>;

    constructor() {
        this.json = null;
        this.delivered = new Set();
    }

    get payload() {
        return this.json ?? (this.json = JSON.stringify(this));
    }

    abstract toJSON(): WS.Events[EventName];
}
