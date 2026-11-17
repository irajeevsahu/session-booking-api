import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { HttpStatus } from '../utils/constants';
import { sendSuccess } from '../utils/response';
import type { IdParams } from '../validators/common.validator';
import type { CreateUserInput } from '../validators/user.validator';

export async function createUser(req: Request, res: Response) {
  const user = await userService.createUser(req.body as CreateUserInput);
  sendSuccess(res, user, HttpStatus.CREATED, 'User created successfully');
}

export async function getUserSessions(req: Request, res: Response) {
  const { id } = req.params as IdParams;
  const sessions = await userService.getUserSessions(id);
  sendSuccess(res, sessions);
}
