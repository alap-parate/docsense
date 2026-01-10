import { Request } from "express";

export interface AuthUser {
    id: string;
    email?: string;
    tenantId?: string;
}

export interface RequestWithUser extends Request {
    user: AuthUser
}