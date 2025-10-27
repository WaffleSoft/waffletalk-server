import { Long } from "mongodb";

interface SchemasNoId {
    "guild": {
        name: string;
    };
    "guildchannel": {
        name: string;
        position: number;
        topic: string | null;
        guildId: Long;
    };
    "guildmember": {
        userId: Long;
        guildId: Long;
    };
    "message": {
        authorId: Long;
        content: string;
        edited: number | null;
        channelId: Long;
    };
    "user": {
        username: string;
        passhash: string;
    };
    "session": {
        userId: Long;
        token: string;
    };
}

export type Schemas = {
    [Schema in keyof SchemasNoId]: { _id: Long } & SchemasNoId[Schema];
}
