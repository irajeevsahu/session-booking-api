import type { Request, Response } from 'express';
import * as sessionService from '../services/session.service';
import { HttpStatus } from '../utils/constants';
import { sendSuccess } from '../utils/response';
import type { IdParams } from '../validators/common.validator';
import type {
  AvailableSessionsQuery,
  BookSessionInput,
  CreateSessionInput,
} from '../validators/session.validator';

export async function createSession(req: Request, res: Response) {
  const session = await sessionService.createSession(req.body as CreateSessionInput);
  sendSuccess(res, session, HttpStatus.CREATED, 'Session created successfully');
}

export async function getAvailableSessions(req: Request, res: Response) {
  const { dateTimestamp } = req.query as unknown as AvailableSessionsQuery;
  const result = await sessionService.getAvailableSessions(dateTimestamp);
  sendSuccess(res, result);
}

export async function bookSession(req: Request, res: Response) {
  const { id } = req.params as IdParams;
  const { userId } = req.body as BookSessionInput;
  const session = await sessionService.bookSession(id, userId);
  sendSuccess(res, session, HttpStatus.OK, 'Session booked successfully');
}

export async function completeSession(req: Request, res: Response) {
  const { id } = req.params as IdParams;
  const session = await sessionService.completeSession(id);
  sendSuccess(res, session, HttpStatus.OK, 'Session marked as completed');
}
