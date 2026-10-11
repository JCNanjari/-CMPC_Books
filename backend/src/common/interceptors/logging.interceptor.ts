import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${request.method} ${request.url} ${Date.now() - started}ms`);
        },
        error: (error: { message?: string }) => {
          this.logger.warn(
            `${request.method} ${request.url} falló en ${Date.now() - started}ms: ${error?.message ?? 'error'}`,
          );
        },
      }),
    );
  }
}
