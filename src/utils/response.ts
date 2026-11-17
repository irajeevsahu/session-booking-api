import type { Response } from 'express';
import { HttpStatus } from './constants';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = HttpStatus.OK, message?: string) {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
  });
}
