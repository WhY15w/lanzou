import config from './config/config.js';
import lanzouRouter from './routes/lanzou.js';
import { serve } from '@hono/node-server';
import dayjs from 'dayjs';
import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { cors } from 'hono/cors';

const app = new Hono();

app.use(cors());

app.use(rateLimiter(config.rateLimit));

app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  console.log(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ${c.req.method} ${url.pathname}${url.search}`,
  );
  await next();
});

app.route('/lanzou', lanzouRouter);

app.notFound((c) => {
  return c.json({ success: false, message: '接口不存在' }, 404);
});

app.onError((err, c) => {
  console.error(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 未捕获错误:`,
    err.message,
  );
  return c.json(
    {
      success: false,
      message: '服务器内部错误',
      data: { error: err.message },
    },
    500,
  );
});

serve({ fetch: app.fetch, port: config.PORT }, () => {
  console.log(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Server running at http://127.0.0.1:${config.PORT}`,
  );
});
