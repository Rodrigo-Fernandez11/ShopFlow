import { createApp } from './app';
import { env } from '@config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server corriendo en http://localhost:${env.PORT}`);
  console.log(`📦 Entorno: ${env.NODE_ENV}`);
});

const shutdown = (signal: string) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('✅ Servidor cerrado.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
