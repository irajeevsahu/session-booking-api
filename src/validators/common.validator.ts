import { z } from 'zod';

export const objectIdSchema = z
  .string({ required_error: 'is required' })
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'must be a valid 24-character hex ObjectId');

export const idParamsSchema = z.object({ id: objectIdSchema });

/** Accepts an ISO-8601 date string or a Unix timestamp in milliseconds. */
export const dateInputSchema = z
  .union([z.string().trim().min(1), z.number()], {
    errorMap: () => ({ message: 'must be an ISO date string or a timestamp in milliseconds' }),
  })
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), 'must be a valid date');

export type IdParams = z.infer<typeof idParamsSchema>;
