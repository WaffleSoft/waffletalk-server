import { ClientEvent } from "../events/ClientEvent";
import { EventRouter } from "../events/EventRouter";

export class ReplicableMutation<Data extends PrimitiveRecord> extends ClientEvent<"replicable.mutation"> {
    constructor(
        public readonly replicable: Replicable<Data>,
        public readonly property: Extract<keyof Data, string>,
        public readonly value: Data[typeof property]
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

export class Replicable<Data extends PrimitiveRecord = any> extends EventRouter<ReplicableMutation<Data>> {
    readonly id: Snowflake;
    readonly data: Data;

    constructor(id: Snowflake, data: Data) {
        super();
        const self = this;
        this.id = id;
        this.data = new Proxy({ ...data }, {
            set(obj, property, value) {
                if (typeof property === "string") self.emit(
                    new ReplicableMutation(
                        self,
                        property as Extract<keyof Data, string>,
                        value as Data[Extract<keyof Data, string>]
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
