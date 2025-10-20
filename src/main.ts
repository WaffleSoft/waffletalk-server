import express, { ErrorRequestHandler } from "express";
import expressWs from "express-ws";
import { readFileSync } from "fs";
import { assert } from "./util/assert";
import { MongoDBDriver } from "./database/mongodb/MongoDBDriver";
import { DatabaseDriver } from "./database/DatabaseDriver";
import { Client } from "./events/Client";
import { User } from "./apiobject/User";

async function main() {
    const { app } = expressWs(express());
    const cfg = JSON.parse(readFileSync("/etc/waffletalk.json").toString());
    const dd: DatabaseDriver = await MongoDBDriver.instantiate();

    const methods: {
        [Method in keyof WS.Interactions]: (req: WS.Interactions[Method]["request"]["data"], client: Client) =>
          Promise<WS.Interactions[Method]["response"]["data"]>
        |         WS.Interactions[Method]["response"]["data"]
    } = {
        "ping": ({ message }, client) => {
            return { message };
        }
    };

    app.post("/authentication", async (req, res) => {
        const header = req.header("Authentication");
        if (header === undefined) return res.sendStatus(400);
        const credentials = new URLSearchParams(header);
        const username = credentials.get("username");
        const clienthash = credentials.get("clienthash");
        assert(typeof username === "string");
        assert(typeof clienthash === "string");
        let token;
        try {
            token = await dd.authenticate(username!, clienthash!);
        } catch (e) {
            res.status(400).json({
                err: typeof e === "string" ? e : "server_error",
                data: null
            });
            return;
        }
        res.status(200).json({
            err: null,
            data: {
                token
            }
        });
    });

    app.use(((err, req, res, next) => {
        console.error(err);
        res.status(500);
    }) as ErrorRequestHandler);

    app.ws("/ws", async (ws, req) => {
        const token = req.header("X-Authorization");
        if (token === undefined) return ws.close(1008);  // Policy violation
        let user: User;
        try { user = await dd.authorize(token); }
        catch { return ws.close(3000); }
        console.log("Connection opened: " + user.data.username);
        const client = new Client({ user, socket: ws });
        user.clients.add(client);
        ws.on("close", () => user.clients.delete(client));
        ws.on("message", async (msg) => {
            console.log(msg);
            const req: WS.Interaction["request"] = JSON.parse(msg.toString());
            assert(req.method in methods, "method not supported");
            try {
                const rep = await methods[req.method](req.data as any, client);
                ws.send(JSON.stringify({
                    event: "response",
                    seq: req.seq,
                    data: rep,
                    err: null
                } as WS.Interaction["response"]));
            } catch (err) {
                ws.send(JSON.stringify({
                    event: "response",
                    seq: req.seq,
                    data: null,
                    err
                } as WS.Interaction["response"]));
            }
        });
    });

    app.listen(cfg.port, () => {
        console.log(`WaffleTalk server listening on port ${cfg.port}.`);
    });
}

main();
