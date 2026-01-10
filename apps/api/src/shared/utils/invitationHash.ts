import { createHash } from "crypto";

export function generateInvitationHash(
    tenantId: string,
    email: string,
    secret: string
) {
    return createHash('sha256')
        .update(`${tenantId}:${email}:${secret}`)
        .digest('hex');
}