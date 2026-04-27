import type { Context } from 'hono';

const DEFAULT_PORT = 1103;

const parsePort = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
};

export const PORT = parsePort(process.env.PORT);
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
