import { Replicable, ReplicableMutation } from "./Replicable";
import { Node, OrderedSet } from "./OrderedSet";
import { SignalRouter } from "../signals/SignalRouter";
import { SocketSignal } from "../signals/SocketSignal";

export class BucketShift<R extends Replicable> extends SocketSignal<"bucket.shift"> {
    constructor(
        public readonly bucket: Bucket<R>,
        public readonly add: R[],
        public readonly remove: R[]
    ) {
        super();
    }

    toJSON(): WS.Events["bucket.shift"] {
        return {
            event: "bucket.shift",
            data: {
                id: this.bucket.id,
                add: this.add,
                remove: this.remove.map((m) => m.id)
            }
        };
    }
}

class MutationTrap<R extends Replicable> extends SignalRouter<ReplicableMutation<R>> {
    constructor(private bucket: Bucket<R>) {
        super();
    }

    on(signal: ReplicableMutation<R>) {
        if (this.bucket.set.leq(this.bucket.min!, signal.replicable)
         && this.bucket.set.leq(signal.replicable, this.bucket.max!)) {
            this.emit(signal);
        } else {
            this.bucket.set.remove(signal.value);
            this.bucket.set.add(signal.value);
        }
    }
}

export class Bucket<R extends Replicable> extends SignalRouter<BucketShift<R> | ReplicableMutation<R>> {
    static counter = 0;

    readonly id = (++Bucket.counter).toString(16);
    readonly nextLink: (Bucket<R> | null)[] = [];
    readonly prevLink: Node<R>[] = [];
    readonly mutations = new MutationTrap(this);
    members: R[] = [];

    constructor(
        readonly set: OrderedSet<R>
    ) {
        super();
        this.addSource(this.mutations);
    }

    add(value: R) {
        if (this.size < 1 || this.set.leq(this.max!, value)) this.members.push(value);
        else this.members.splice(this.members.findIndex((v, i) => this.set.leq(v, value) && this.set.leq(value, this.members[i + 1])), 0, value);
        this.emit(
            new BucketShift(
                this,
                [value],
                []
            )
        );
        this.mutations.addSource(value);
    }

    remove(value: R) {
        this.mutations.removeSource(value);
        this.emit(
            new BucketShift(
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
