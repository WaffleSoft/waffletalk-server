export function assert(predicate: boolean, reason?: string) {
    if (!predicate) throw { type: "assertion_error", reason: reason ?? null };
}
