import type { Context } from 'hono';

export const PORT = 1103;
export const rateLimit = {
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: (c: Context) => c.req.header('x-forwarded-for') ?? '',
};

const config = {
  PORT,
  rateLimit,
};

export default config;
