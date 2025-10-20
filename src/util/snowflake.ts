import { pid, env } from "process";

export function SnowflakeGenerator() {
    let incrementor = 0;
    return () =>
        (BigInt(Math.floor(Date.now() / 1000)) << 22n)
      + (BigInt(env["WORKER_ID"] ?? 0) << 17n)
      + (BigInt(pid) << 12n)
      +  BigInt(incrementor = (incrementor + 1) % 4096)
        .toString();
};
