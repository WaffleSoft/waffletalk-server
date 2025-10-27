import { SocketSignal } from "../signals/SocketSignal";
import { SignalRouter } from "../signals/SignalRouter";

export class ReplicableMutation<R extends Replicable> extends SocketSignal<"replicable.mutation"> {
    constructor(
        public readonly replicable: R,
        public readonly property: Extract<keyof R["data"], string>,
        public readonly value: R["data"][typeof property]
    ) {
        super();
    }

    toJSON(): WS.Events["replicable.mutation"] {
        return {
            event: "replicable.mutation",
            data: {
                id: this.replicable.id,
                property: this.property,
                value: this.value
            }  
        };
    }
}

export class Replicable<Data extends PrimitiveRecord = any> extends SignalRouter<ReplicableMutation<Replicable<Data>>> {
    readonly id: Snowflake;
    readonly data: Data;

    constructor(id: Snowflake, data: Data) {
        super();
        const self = this;
        this.id = id;
        this.data = new Proxy({ ...data }, {
            set(obj, property, value) {
                if (typeof property === "string") self.emit(
                    new ReplicableMutation<Replicable<Data>>(
                        self,
                        property as Extract<keyof Data, string>,
                        value
                    )
                );
                return Reflect.set(obj, property, value);
            },
            deleteProperty() {
                throw "properties may not be deleted";
            }
        });
    }

    toJSON() {
        return {
            id: this.id,
            ...this.data
        };
    }
}
