import { Router } from 'express';
import mongoose from 'mongoose';
import sessionRoutes from './session.routes';
import teacherRoutes from './teacher.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    data: { status: dbConnected ? 'ok' : 'degraded', database: dbConnected ? 'connected' : 'disconnected' },
  });
});

router.use('/users', userRoutes);
router.use('/teachers', teacherRoutes);
router.use('/sessions', sessionRoutes);

export default router;
