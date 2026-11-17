import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../validators/common.validator';
import { createUserSchema } from '../validators/user.validator';

const router = Router();

router.post('/', validate({ body: createUserSchema }), userController.createUser);
router.get('/:id/sessions', validate({ params: idParamsSchema }), userController.getUserSessions);

export default router;
