import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import authConfig from 'src/core/config/configuration/authConfig';

@Injectable()
export class JwtVerifierService {

    private client;

    constructor(
        @Inject(authConfig.KEY)
        private readonly auth: ConfigType<typeof authConfig>
    ) {
        this.client = jwksClient({
            jwksUri: auth.jwksUrl,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 10 * 60 * 1000,
            rateLimit: true,
            jwksRequestsPerMinute: 10
        });
    }
    

    private getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
        this.client.getSigningKey(header.kid, (err, key) => {
            if (err) {
                return callback(err);
            }
            callback(null, key?.getPublicKey());
        });
    }

    async verify(token: string): Promise<jwt.JwtPayload> {
        return new Promise((resolve, reject) => {
            jwt.verify(
                token,
                this.getKey.bind(this),
                {
                    algorithms: this.auth.algorithm,
                    audience: this.auth.audience,
                    issuer: this.auth.jwtIss
                },
                (err, decoded) => {
                    if (err) {
                        console.log(err)
                        return reject(
                            new UnauthorizedException('Invalid or expired token'),
                        );
                    }
                    resolve(decoded as jwt.JwtPayload)
                },
            );
        });
    }
}