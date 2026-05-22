import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '@config/env.js';
import { authRouter } from './routes/auth.js';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // Health check — publicly accessible, no auth middleware
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes — publicly accessible (login, register, refresh, logout)
  app.use('/api/auth', authRouter);

  return app;
}