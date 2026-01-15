import { createHmac } from "crypto";

export function generateHash(
    token: string,
    secret: string
): string {
    return createHmac('sha256', secret)
        .update(token)
        .digest('hex');
}