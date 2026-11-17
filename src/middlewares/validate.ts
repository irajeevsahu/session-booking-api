import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

type RequestPart = 'body' | 'query' | 'params';
type ValidationSchemas = Partial<Record<RequestPart, ZodTypeAny>>;

/**
 * Validates and normalizes request input. Parsed values replace the raw ones,
 * so controllers always receive trimmed / coerced data.
 * (Express 5 exposes req.query as a getter, hence defineProperty.)
 */
export const validate =
  (schemas: ValidationSchemas) => (req: Request, _res: Response, next: NextFunction) => {
    const errors: Record<string, string[]> = {};

    for (const part of Object.keys(schemas) as RequestPart[]) {
      const result = schemas[part]!.safeParse(req[part] ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = [part, ...issue.path].join('.');
          (errors[key] ??= []).push(issue.message);
        }
        continue;
      }
      Object.defineProperty(req, part, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    if (Object.keys(errors).length > 0) {
      return next(AppError.badRequest('Validation failed', errors));
    }
    return next();
  };
