import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  // Make sure indexes (e.g. unique email) exist before accepting traffic.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
