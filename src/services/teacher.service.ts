import { TeacherModel } from '../models/teacher.model';
import type { CreateTeacherInput } from '../validators/teacher.validator';

export async function createTeacher(input: CreateTeacherInput) {
  const teacher = await TeacherModel.create(input);
  return teacher.toObject();
}

export async function listTeachers() {
  return TeacherModel.find().sort({ createdAt: -1 }).lean();
}
