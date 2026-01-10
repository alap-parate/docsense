import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../errors/common-error.codes';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId;

    // Default response
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      // Validation error (from ValidationPipe)
      if (status === HttpStatus.BAD_REQUEST && res?.message instanceof Array) {
        errorCode = ErrorCode.VALIDATION_ERROR;
        message = 'Request validation failed';

        details = {
          fields: res.message.map((err: any) => ({
            field: err.property,
            code: Object.keys(err.constraints)[0].toUpperCase(),
            message: Object.values(err.constraints)[0],
          })),
        };
      } else {
        errorCode = this.mapStatusToErrorCode(status);
        message = res?.message ?? exception.message;
      }
    }

    response.status(status).json({
      data: null,
      meta: {
        requestId,
      },
      error: {
        code: errorCode,
        message,
        details,
      },
    });
  }

  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
