import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((response) => {
        // response may be null, object, or array
        if (response == null) {
          return {
            data: null,
            meta: {
              requestId: req.requestId,
            },
            error: null,
          };
        }

        // Extract pagination if present
        const { pagination, ...data } =
          typeof response === 'object' && !Array.isArray(response)
            ? response
            : { data: response };

        return {
          data: data ?? null,
          meta: {
            requestId: req.requestId,
            ...(pagination && { pagination }),
          },
          error: null,
        };
      }),
    );
  }
}
