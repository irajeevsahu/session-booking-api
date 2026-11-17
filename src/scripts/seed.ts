/**
 * Seeds sample teachers and AVAILABLE sessions for tomorrow (UTC).
 * Idempotent and non-destructive: teachers are upserted by email and
 * overlapping sessions are skipped.
 *
 *   npm run seed
 */
import { connectDatabase, disconnectDatabase } from '../config/db';
import { TeacherModel } from '../models/teacher.model';
import { createSession } from '../services/session.service';
import { AppError } from '../utils/AppError';

const teachers = [
  {
    fullName: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    specialization: 'Mathematics',
    experience: 8,
  },
  { fullName: 'Rohan Mehta', email: 'rohan.mehta@example.com', specialization: 'Physics', experience: 5 },
  {
    fullName: 'Priya Nair',
    email: 'priya.nair@example.com',
    specialization: 'English Literature',
    experience: 12,
  },
];

// Session slots (UTC hours) created for each teacher tomorrow.
const slotHours = [9, 11, 15];

function tomorrowAtUtc(hour: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, hour));
}

async function seed() {
  await connectDatabase();

  let createdSessions = 0;

  for (const data of teachers) {
    const teacher = await TeacherModel.findOneAndUpdate({ email: data.email }, data, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    console.log(`Teacher: ${teacher.fullName.padEnd(16)} id=${teacher._id}`);

    for (const hour of slotHours) {
      const startTime = tomorrowAtUtc(hour);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      try {
        await createSession({ teacherId: teacher._id.toString(), startTime, endTime });
        createdSessions += 1;
      } catch (error) {
        if (!(error instanceof AppError && error.statusCode === 409)) throw error;
      }
    }
  }

  const tomorrow = tomorrowAtUtc(0);
  console.log(
    `\nCreated ${createdSessions} new AVAILABLE session(s) for ${tomorrow.toISOString().slice(0, 10)}.`,
  );
  console.log(`Try: GET /sessions/available?dateTimestamp=${tomorrow.getTime()}`);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
