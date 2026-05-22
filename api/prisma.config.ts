import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// Load .env before Prisma reads environment variables
config();

// Prisma 7 configuration — driver adapter pattern
// The CLI migration engine still needs a direct DB URL for migrate commands.
// See: https://pris.ly/d/config-datasource
export default defineConfig({
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
