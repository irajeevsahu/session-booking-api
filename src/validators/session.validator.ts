import { z } from 'zod';
import { dateInputSchema, objectIdSchema } from './common.validator';

export const createSessionSchema = z
  .object({
    teacherId: objectIdSchema,
    startTime: dateInputSchema,
    endTime: dateInputSchema,
  })
  .refine((data) => data.endTime.getTime() > data.startTime.getTime(), {
    message: 'endTime must be greater than startTime',
    path: ['endTime'],
  });

/**
 * dateTimestamp is a Unix timestamp in milliseconds. A 10-digit value is
 * treated as seconds for convenience.
 */
export const availableSessionsQuerySchema = z.object({
  dateTimestamp: z
    .string({ required_error: 'is required' })
    .trim()
    .regex(/^\d{1,16}$/, 'must be a numeric Unix timestamp')
    .transform(Number)
    .transform((value) => (value < 1e11 ? value * 1000 : value))
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'must be a valid timestamp'),
});

export const bookSessionSchema = z.object({
  userId: objectIdSchema,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type AvailableSessionsQuery = z.infer<typeof availableSessionsQuerySchema>;
export type BookSessionInput = z.infer<typeof bookSessionSchema>;
