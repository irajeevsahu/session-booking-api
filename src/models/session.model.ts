import { Schema, model, type InferSchemaType } from 'mongoose';
import { SESSION_STATUSES, SessionStatus } from '../utils/constants';

const sessionSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      default: SessionStatus.AVAILABLE,
      required: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// API 3: available sessions for a given day
sessionSchema.index({ status: 1, startTime: 1 });
// API 6: a user's sessions grouped by status
sessionSchema.index({ userId: 1, status: 1 });
// Overlap check when a teacher creates a session
sessionSchema.index({ teacherId: 1, startTime: 1 });

export type Session = InferSchemaType<typeof sessionSchema>;
export const SessionModel = model('Session', sessionSchema);
