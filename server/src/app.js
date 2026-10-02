import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptions } from './config/cors.js';
import { isProd } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1); // correct client IPs behind Nginx / load balancer (rate limiting)
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProd ? 'combined' : 'dev'));

app.get('/', (_req, res) => res.json({ name: 'MotorDesk API', version: 'v1', docs: '/api/v1/health' }));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
