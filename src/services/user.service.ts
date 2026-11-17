import { Types, type PipelineStage } from 'mongoose';
import { SessionModel } from '../models/session.model';
import { TeacherModel } from '../models/teacher.model';
import { UserModel } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { SessionStatus } from '../utils/constants';
import type { CreateUserInput } from '../validators/user.validator';

export async function createUser(input: CreateUserInput) {
  // Uniqueness is enforced by the unique index on `email`; a duplicate raises
  // Mongo error 11000, which the central error handler maps to 409 Conflict.
  const user = await UserModel.create(input);
  return user.toObject();
}

export async function ensureUserExists(userId: string): Promise<void> {
  const exists = await UserModel.exists({ _id: userId });
  if (!exists) {
    throw AppError.notFound('User not found');
  }
}

/**
 * API 6 — a user's sessions split into upcoming (BOOKED) and completed
 * (COMPLETED), built with a single aggregation pipeline using $facet.
 */
export async function getUserSessions(userId: string) {
  await ensureUserExists(userId);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId: new Types.ObjectId(userId),
        status: { $in: [SessionStatus.BOOKED, SessionStatus.COMPLETED] },
      },
    },
    {
      $lookup: {
        from: TeacherModel.collection.name,
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher',
        pipeline: [{ $project: { fullName: 1, email: 1, specialization: 1, experience: 1 } }],
      },
    },
    { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        teacher: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        completedAt: 1,
        durationMinutes: {
          $dateDiff: { startDate: '$startTime', endDate: '$endTime', unit: 'minute' },
        },
      },
    },
    {
      $facet: {
        upcomingSessions: [
          { $match: { status: SessionStatus.BOOKED } },
          { $sort: { startTime: 1 } },
          { $project: { completedAt: 0 } },
        ],
        completedSessions: [{ $match: { status: SessionStatus.COMPLETED } }, { $sort: { completedAt: -1 } }],
      },
    },
    {
      $project: {
        upcomingSessions: 1,
        completedSessions: 1,
        totals: {
          upcoming: { $size: '$upcomingSessions' },
          completed: { $size: '$completedSessions' },
        },
      },
    },
  ];

  const [result] = await SessionModel.aggregate(pipeline);
  return { userId, ...result };
}
