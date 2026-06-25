import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));

app.route('/', flue());

export default app;
