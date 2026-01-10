import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";    

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: any, _: any, next: () => void) {
        req.requestId = req.header['x-request-id'] ?? `req_${randomUUID()}`;
        next();
    }
}