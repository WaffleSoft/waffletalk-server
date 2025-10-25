import { Replicable, ReplicableMutation } from "./Replicable";
import { Node, OrderedSet } from "./OrderedSet";
import { EventRouter } from "../events/EventRouter";
import { ClientEvent } from "../events/ClientEvent";

export class BucketMutation<R extends Replicable> extends ClientEvent<"bucket.mutation"> {
    constructor(
        public readonly bucket: Bucket<R>,
        public readonly add: R[],
        public readonly remove: R[]
    ) {
        super();
    }

    toJSON(): WS.Events["bucket.mutation"] {
        return {
            event: "bucket.mutation",
            data: {
                id: this.bucket.id,
                add: this.add,
                remove: this.remove.map((m) => m.id)
            }
        };
    }
}

export class Bucket<R extends Replicable> extends EventRouter<BucketMutation<R> | ReplicableMutation<R["data"]>> {
    static counter = 0;

    readonly id = (++Bucket.counter).toString(16);
    readonly nextLink: (Bucket<R> | null)[] = [];
    readonly prevLink: Node<R>[] = [];
    members: R[] = [];

    constructor(
        readonly set: OrderedSet<R>
    ) {
        super();
    }

    add(value: R) {
        if (this.size < 1 || this.set.leq(this.max!, value)) this.members.push(value);
        else this.members.splice(this.members.findIndex((v, i) => this.set.leq(v, value) && this.set.leq(value, this.members[i + 1])), 0, value);
        this.emit(
            new BucketMutation(
                this,
                [value],
                []
            )
        );
        this.addSource(value);
    }

    remove(value: R) {
        this.removeSource(value);
        this.emit(
            new BucketMutation(
                this,
                [],
                [value]
            )
        );
        this.members.splice(this.members.indexOf(value), 1);
    }

    get next(): Bucket<R> | null {
        return this.nextLink[0];
    }

    get prev(): Bucket<R> | null {
        return this.prevLink[0] instanceof Bucket ? this.prevLink[0] : null;
    }

    get min(): R | undefined {
        return this.members[0];
    }

    get max(): R | undefined {
        return this.members[this.size - 1];
    }

    get size() {
        return this.members.length;
    }
}
