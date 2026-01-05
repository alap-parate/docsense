import { registerAs } from "@nestjs/config";
import jwt from "jsonwebtoken";
export interface AuthConfig {
    jwksUrl: string;
    jwtIss: string;
    audience: string;
    algorithm: jwt.Algorithm[];
}

export default registerAs('auth', (): AuthConfig => ({
    jwksUrl: process.env.JWKS_URL!,
    jwtIss: process.env.JWT_ISSUER!,
    audience: process.env.JWT_AUDIENCE!,
    algorithm: process.env.JWT_ALGORITHM
                ? process.env.JWT_ALGORITHM.split(',').map(a => a.trim() as jwt.Algorithm)
                : ['ES256'],
}))