import { Bucket, BucketShift } from "./Bucket";
import { Replicable } from "./Replicable";

type Head<R extends Replicable> = { nextLink: [Bucket<R>, ...Bucket<R>[]] };
export type Node<R extends Replicable> = Head<R> | Bucket<R>;

export class OrderedSet<R extends Replicable> {
    readonly comparator: (a: R, b: R) => number;
    readonly p: number;
    readonly maxBucketSize: number;
    private head: Head<R>;
    private bucketMap: Map<Snowflake, Bucket<R>>;

    constructor(comparator: (a: R, b: R) => number, { p, maxBucketSize }: Partial<{ p: number, maxBucketSize: number }> = {}) {
        this.comparator = comparator ?? (() => 0);
        this.p = p ?? 0.5;
        this.maxBucketSize = maxBucketSize ?? 64;
        this.head = { nextLink: [new Bucket(this)] };
        this.bucketMap = new Map();
    }

    get(id: Snowflake) {
        return this.bucketMap.get(id)?.members.find((m) => m.id === id);
    }

    lt(a: R, b: R) {
        return this.comparator(a, b) < 0;
    }

    leq(a: R, b: R) {
        return this.comparator(a, b) <= 0;
    }

    add(value: R) {
        if (this.bucketMap.has(value.id)) return;
        const [bucket, path] = this.fit(value);
        bucket.add(value);
        this.bucketMap.set(value.id, bucket);
        while (bucket.size > this.maxBucketSize) this.splitBucket(bucket, path);
    }

    remove(value: R) {
        const bucket = this.bucketMap.get(value.id);
        if (bucket === undefined) return;
        bucket.remove(value);
        this.bucketMap.delete(value.id);
        if (bucket.size < 1) this.unlinkBucket(bucket);
    }

    fit(value: R): [Bucket<R>, Node<R>[]] {
        const path: Node<R>[] = new Array(this.size);
        let bucket: Bucket<R> = this.head.nextLink[this.size - 1];
        if (bucket.size < 1) {
            bucket.add(value);
            path.fill(bucket);
            return [bucket, path];
        }
        for (let rank = this.size - 1; rank >= 0; rank--) {
            while (bucket.nextLink[rank] !== null && this.lt(bucket.nextLink[rank]!.min!, value)) bucket = bucket.nextLink[rank]!;
            path[rank] = bucket;
        }
        return [bucket, path];
    }

    splitBucket(bucket: Bucket<R>, path: Node<R>[]) {
        const upper = new Bucket(this);

        // Members are reassigned to the new Bucket.
        upper.members = bucket.members.splice(-Math.min(Math.floor(bucket.members.length / 2), this.maxBucketSize));
        bucket.emit(
            new BucketShift(
                bucket,
                [],
                upper.members
            )
        );
        upper.emit(
            new BucketShift(
                upper,
                upper.members,
                []
            )
        );
        for (const value of upper.members) {
            bucket.removeSource(value);
            upper.addSource(value);
            this.bucketMap.set(value.id, upper);
        }

        // Links are assigned within the skip list.
        let rank = 0;
        while (rank < this.size) {
            const n = path[rank].nextLink[rank];
            path[rank].nextLink[rank] = bucket;
            bucket.prevLink.push(path[rank]);
            if (n !== null) {
                bucket.nextLink.push(n);
                n.prevLink[rank] = bucket;
            }
            if (Math.random() < this.p) break;
            rank++;
        }
        if (rank === this.size) {
            this.head.nextLink.push(bucket);
            bucket.nextLink.push(null);
            bucket.prevLink.push(this.head);
        }
    }

    unlinkBucket(bucket: Bucket<R>) {
        if (bucket.size > 0) throw "cannot unlink non-empty Bucket";
        for (let rank = 0; rank < bucket.nextLink.length; rank++) {
            bucket.prevLink[rank].nextLink[rank] = bucket.nextLink[rank];
            if (bucket.nextLink[rank] !== null) bucket.nextLink[rank]!.prevLink[rank] = bucket.prevLink[rank];
        }
        while (this.head.nextLink[this.size - 1] === null) this.head.nextLink.pop();
    }

    get size() {
        return this.head.nextLink.length;
    }
}
