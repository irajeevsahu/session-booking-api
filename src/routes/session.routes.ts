import { Router } from 'express';
import * as sessionController from '../controllers/session.controller';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../validators/common.validator';
import {
  availableSessionsQuerySchema,
  bookSessionSchema,
  createSessionSchema,
} from '../validators/session.validator';

const router = Router();

router.post('/', validate({ body: createSessionSchema }), sessionController.createSession);

router.get(
  '/available',
  validate({ query: availableSessionsQuerySchema }),
  sessionController.getAvailableSessions,
);

router.post(
  '/:id/book',
  validate({ params: idParamsSchema, body: bookSessionSchema }),
  sessionController.bookSession,
);

router.patch('/:id/complete', validate({ params: idParamsSchema }), sessionController.completeSession);

export default router;
