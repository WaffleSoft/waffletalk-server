interface SchemasNoId {
    "guild": {
        name: string;
    };
    "guildchannel": {
        name: string;
        position: number;
        topic: string | null;
        guildId: Snowflake;
    };
    "guildmember": {
        userId: Snowflake;
        guildId: Snowflake;
    };
    "message": {
        authorId: Snowflake;
        content: string;
        edited: number | null;
        channelId: Snowflake;
    };
    "user": {
        username: string;
        passhash: string;
    };
    "session": {
        userId: string;
        token: string;
    };
}

export type Schemas = {
    [Schema in keyof SchemasNoId]: { _id: Snowflake } & SchemasNoId[Schema];
}
