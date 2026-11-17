import type { Request, Response } from 'express';
import * as teacherService from '../services/teacher.service';
import { HttpStatus } from '../utils/constants';
import { sendSuccess } from '../utils/response';
import type { CreateTeacherInput } from '../validators/teacher.validator';

export async function createTeacher(req: Request, res: Response) {
  const teacher = await teacherService.createTeacher(req.body as CreateTeacherInput);
  sendSuccess(res, teacher, HttpStatus.CREATED, 'Teacher created successfully');
}

export async function listTeachers(_req: Request, res: Response) {
  const teachers = await teacherService.listTeachers();
  sendSuccess(res, teachers);
}
