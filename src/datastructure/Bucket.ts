import { Replicable, ReplicableMutation } from "./Replicable";
import { Node } from "./OrderedSet";
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

type BucketData = { pv: Snowflake | null, nx: Snowflake | null };

export class Bucket<R extends Replicable> extends EventRouter<BucketMutation<R> | ReplicableMutation<R["data"]> | ReplicableMutation<BucketData>> {
    static counter = 0;
    static MAX_SIZE = 64;

    readonly replicable: Replicable<BucketData>;
    readonly comparator: (a: R, b: R) => number;
    readonly nextLink: (Bucket<R> | null)[];
    readonly prevLink: Node<R>[];
    members: R[];

    constructor(comparator: (a: R, b: R) => number) {
        super();
        this.replicable = new Replicable((++Bucket.counter).toString(16), {
            pv: null as string | null,
            nx: null as string | null
        });
        this.addSource(this.replicable);
        this.comparator = comparator;
        this.nextLink = [];
        this.prevLink = [];
        this.members = [];
    }

    get id() {
        return this.replicable.id;
    }

    add(value: R) {
        this.members.push(value);
        this.members.sort(this.comparator);
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

    get next() {
        return this.nextLink[0];
    }

    get prev(): Bucket<R> | null {
        return this.prevLink[0] instanceof Bucket ? this.prevLink[0] : null;
    }

    get min() {
        return this.members[0];
    }

    get max() {
        return this.members[this.size - 1];
    }

    get size() {
        return this.members.length;
    }

    fits(value: R) {
        // TODO: checking twice every pass here.
        return (this.prev === null || this.comparator(this.min, value) <= 0)
            && (this.next === null || this.comparator(value, this.next.min) <= 0);
    }
}
