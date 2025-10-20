type Snowflake = string;
type Primitive = string | number | boolean | null;
type PrimitiveRecord = Record<string, Primitive>;
type NonNullPrimitiveRecord = Record<string, Omit<Primitive, null>>;
type Constructor<T, Args extends any[] = any[]> = { new (...args: Args): T };

declare namespace WS {
    interface ApiObject {
        id: Snowflake;
    }

    /* API Types */
    interface User extends ApiObject {
        username: string;
    }
    interface GuildMember extends ApiObject {
        userId: string;
    }
    interface Guild extends ApiObject {
        name: string;
    }
    interface GuildChannel extends ApiObject {
        name: string;
        position: number;
        topic: string | null;
    }
    interface Message extends ApiObject {
        authorId: string;
        content: string;
        edited: number | null;
    }

    interface BaseInteraction<RequestData, ResponseData> {
        request: {
            seq: number;
            data: RequestData;
        };
        response: {
            seq: number;
            err: string | null;
            data: ResponseData | null;
        };
    }

    interface BaseEvent<Data> {
        data: Data;
    }

    interface Replicable<Data = any> {
        id: Snowflake;
        data: Data;
    }

    interface InteractionMap {
        "ping": BaseInteraction<{ message: string }, { message: string }>;
    }

    interface EventMap {
        "response": BaseEvent<Interaction[keyof Interaction]["response"]>;
        "replicable.mutation": BaseEvent<{ id: Snowflake, property: string, value: any }>;
        "bucket.mutation": BaseEvent<{ id: Snowflake, add: Replicable[], remove: Snowflake[] }>;
    }
    

    type Interactions = { [Method in keyof InteractionMap]: {
        request: { method: Method } & InteractionMap[Method]["request"];
        response: InteractionMap[Method]["response"];
    } };
    type Interaction = Interactions[keyof Interactions];

    type Events = { [EventName in keyof EventMap]: { event: EventName } & EventMap[EventName] };
    type Event = Events[keyof Events];
}
