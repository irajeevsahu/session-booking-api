import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string({ required_error: 'is required' }).trim().min(2).max(100),
  email: z.string({ required_error: 'is required' }).trim().toLowerCase().email('must be a valid email'),
  phone: z
    .string({ required_error: 'is required' })
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, 'must be a valid phone number'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
