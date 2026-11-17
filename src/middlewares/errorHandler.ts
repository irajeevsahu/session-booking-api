import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/constants';

interface NormalizedError {
  statusCode: number;
  message: string;
  details?: unknown;
}

function isDuplicateKeyError(err: unknown): err is { code: number; keyValue?: Record<string, unknown> } {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

function normalizeError(err: unknown): NormalizedError {
  if (err instanceof AppError) {
    return { statusCode: err.statusCode, message: err.message, details: err.details };
  }

  if (err instanceof ZodError) {
    return { statusCode: HttpStatus.BAD_REQUEST, message: 'Validation failed', details: err.flatten() };
  }

  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: HttpStatus.BAD_REQUEST, message: `Invalid value for '${err.path}'` };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, error]) => [field, [error.message]]),
    );
    return { statusCode: HttpStatus.BAD_REQUEST, message: 'Validation failed', details };
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return { statusCode: HttpStatus.CONFLICT, message: `A record with this ${field} already exists` };
  }

  // Errors raised by Express' body parser (malformed JSON, payload too large, ...)
  const status = (err as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const type = (err as { type?: string }).type;
    const message =
      type === 'entity.parse.failed' ? 'Malformed JSON in request body' : (err as Error).message;
    return { statusCode: status, message };
  }

  return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
}

// Express recognises error handlers by their 4-argument signature.
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const { statusCode, message, details } = normalizeError(err);

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details !== undefined && { details }),
      ...(!isProduction && statusCode >= 500 && err instanceof Error && { stack: err.stack }),
    },
  });
};
