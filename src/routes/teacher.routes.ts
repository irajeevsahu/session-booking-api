import { Router } from 'express';
import * as teacherController from '../controllers/teacher.controller';
import { validate } from '../middlewares/validate';
import { createTeacherSchema } from '../validators/teacher.validator';

const router = Router();

router.post('/', validate({ body: createTeacherSchema }), teacherController.createTeacher);
router.get('/', teacherController.listTeachers);

export default router;
