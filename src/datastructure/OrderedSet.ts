import { Bucket, BucketMutation } from "./Bucket";
import { Replicable } from "./Replicable";

type Head<R extends Replicable> = { nextLink: [Bucket<R>, ...Bucket<R>[]] };
export type Node<R extends Replicable> = Head<R> | Bucket<R>;

export class OrderedSet<R extends Replicable> {
    readonly comparator: (a: R, b: R) => number;
    readonly p: number;
    private head: Head<R>;
    private bucketMap: Map<Snowflake, Bucket<R>>;

    constructor(comparator: (a: R, b: R) => number, p: number = 0.5) {
        this.comparator = comparator;
        this.p = p;
        this.head = { nextLink: [new Bucket(this.comparator)] };
        this.bucketMap = new Map();
    }

    get(id: Snowflake) {
        return this.bucketMap.get(id)?.members.find((m) => m.id === id);
    }

    add(value: R) {
        if (this.bucketMap.has(value.id)) return;
        const [bucket, path] = this.fit(value);
        bucket.add(value);
        this.bucketMap.set(value.id, bucket);
        while (bucket.size > Bucket.MAX_SIZE) this.splitBucket(bucket, path);
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
        for (let rank = this.size - 1; rank >= 0; rank--) {
            while (!bucket.fits(value)) bucket = bucket.nextLink[rank]!;
            path[rank] = bucket;
        }
        return [bucket, path];
    }

    splitBucket(bucket: Bucket<R>, path: Node<R>[]) {
        const upper = new Bucket(this.comparator);
    
        // Members are reassigned to the new Bucket.
        upper.members = bucket.members.splice(-Math.min(Math.floor(bucket.members.length / 2), Bucket.MAX_SIZE));
        bucket.emit(
            new BucketMutation(
                bucket,
                [],
                upper.members
            )
        );
        upper.emit(
            new BucketMutation(
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

        // ID references in replicable's data are updated.
        bucket.replicable.data.nx = bucket.next?.id ?? null;
        upper.replicable.data.pv = upper.prev?.id ?? null;
        upper.replicable.data.nx = upper.next?.id ?? null;
        if (upper.next !== null) upper.next.replicable.data.pv = upper.id;
    }

    unlinkBucket(bucket: Bucket<R>) {
        if (bucket.size > 0) throw "cannot unlink non-empty Bucket";

        // ID references in replicable's data are updated.
        if (bucket.prev !== null) bucket.prev.replicable.data.nx = bucket.prev?.id ?? null;
        if (bucket.next !== null) bucket.next.replicable.data.pv = bucket.next?.id ?? null;

        // Links are removed within the skip list.
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
