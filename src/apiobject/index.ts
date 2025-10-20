import { Guild } from "./Guild";
import { GuildChannel } from "./GuildChannel";
import { GuildMember } from "./GuildMember";
import { Message } from "./Message";
import { User } from "./User";

export type ApiObject = Guild | GuildChannel | GuildMember | Message | User;

export default { Guild, GuildChannel, GuildMember, Message, User };
