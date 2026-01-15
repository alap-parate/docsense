import { registerAs } from "@nestjs/config";
import { type StringValue } from "ms";

export interface InviteConfig {
    inviteSecret: string;
    expiry: StringValue;
}

export default registerAs('invite', (): InviteConfig => ({
    inviteSecret: process.env.INVITE_TOKEN_SECRET ?? 'your-default-secret',
    expiry: (process.env.INVITE_TOKEN_EXPIRY ?? '24h') as StringValue,
}))