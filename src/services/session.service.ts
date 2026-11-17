import type { PipelineStage } from 'mongoose';
import { SessionModel } from '../models/session.model';
import { TeacherModel } from '../models/teacher.model';
import { AppError } from '../utils/AppError';
import { SessionStatus } from '../utils/constants';
import { getUtcDayRange } from '../utils/date';
import type { CreateSessionInput } from '../validators/session.validator';
import { ensureUserExists } from './user.service';

export async function createSession(input: CreateSessionInput) {
  const { teacherId, startTime, endTime } = input;

  const teacherExists = await TeacherModel.exists({ _id: teacherId });
  if (!teacherExists) {
    throw AppError.notFound('Teacher not found');
  }

  // A teacher cannot run two sessions at the same time.
  const overlapping = await SessionModel.exists({
    teacherId,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (overlapping) {
    throw AppError.conflict('Teacher already has a session that overlaps this time slot');
  }

  const session = await SessionModel.create({ teacherId, startTime, endTime });
  return session.toObject();
}

/**
 * API 3 — all AVAILABLE sessions whose startTime falls on the (UTC) day of the
 * supplied timestamp, joined with teacher details via the aggregation pipeline.
 */
export async function getAvailableSessions(dateTimestamp: number) {
  const { start, end } = getUtcDayRange(dateTimestamp);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        status: SessionStatus.AVAILABLE,
        startTime: { $gte: start, $lt: end },
      },
    },
    { $sort: { startTime: 1 } },
    {
      $lookup: {
        from: TeacherModel.collection.name,
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher',
        pipeline: [{ $project: { fullName: 1, email: 1, specialization: 1, experience: 1 } }],
      },
    },
    // Drops sessions whose teacher no longer exists.
    { $unwind: '$teacher' },
    {
      $project: {
        teacher: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        durationMinutes: {
          $dateDiff: { startDate: '$startTime', endDate: '$endTime', unit: 'minute' },
        },
      },
    },
  ];

  const sessions = await SessionModel.aggregate(pipeline);

  return {
    date: start.toISOString().slice(0, 10),
    range: { from: start, to: end },
    count: sessions.length,
    sessions,
  };
}

/**
 * API 4 — book an AVAILABLE session. The status check and the update happen in
 * one atomic findOneAndUpdate, so two concurrent requests can never both book
 * the same session.
 */
export async function bookSession(sessionId: string, userId: string) {
  await ensureUserExists(userId);

  const booked = await SessionModel.findOneAndUpdate(
    { _id: sessionId, status: SessionStatus.AVAILABLE },
    { $set: { status: SessionStatus.BOOKED, userId } },
    { new: true },
  ).lean();

  if (booked) {
    return booked;
  }

  const existing = await SessionModel.findById(sessionId).select('status').lean();
  if (!existing) {
    throw AppError.notFound('Session not found');
  }
  if (existing.status === SessionStatus.BOOKED) {
    throw AppError.conflict('Session is already booked');
  }
  throw AppError.conflict(`Only AVAILABLE sessions can be booked (current status: ${existing.status})`);
}

/**
 * API 5 — mark a BOOKED session as COMPLETED (atomic, same pattern as booking).
 */
export async function completeSession(sessionId: string) {
  const completed = await SessionModel.findOneAndUpdate(
    { _id: sessionId, status: SessionStatus.BOOKED },
    { $set: { status: SessionStatus.COMPLETED, completedAt: new Date() } },
    { new: true },
  ).lean();

  if (completed) {
    return completed;
  }

  const existing = await SessionModel.findById(sessionId).select('status').lean();
  if (!existing) {
    throw AppError.notFound('Session not found');
  }
  throw AppError.conflict(
    `Only BOOKED sessions can be marked as completed (current status: ${existing.status})`,
  );
}
