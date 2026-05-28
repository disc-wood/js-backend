import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import './jobs/midtermEmail.js';
import { sendMidtermEmails } from './jobs/midtermEmail.js';
import authRoutes from './routes/authRoutes.js';
import emailTemplateRoutes from './routes/emailTemplateRoutes.js';
import customQuestionRoutes from './routes/customQuestionRoutes.js';
import ihtuInfoRoutes from './routes/ihtuInfoRoutes.js';
import oaktonInfoRoutes from './routes/oaktonInfoRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL_DEV,
    ];

    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);

    if (
      typeof origin === 'string' &&
      origin.startsWith('http://localhost:')
    ) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.use((req, res, next) => {
  req.url = req.url.replace(/\/+/g, '/');
  next();
});

app.use('/auth', authRoutes);
app.use('/emailTemplates', emailTemplateRoutes);
app.use('/customQuestions', customQuestionRoutes);
app.use('/oaktonInfo', oaktonInfoRoutes);
app.use('/ihtuInfo', ihtuInfoRoutes);
app.use('/invite', inviteRoutes);
app.use('/users', usersRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Cron trigger for midterm email job — Vercel sends Authorization: Bearer <CRON_SECRET>
app.post('/cron/midterm-email', async (req, res) => {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await sendMidtermEmails();
  res.json({ success: true });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
  });

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message,
  });
});

if (process.env.NODE_ENV !== 'production') {
  console.log('CORS Configuration:', {
    allowedOrigins: [process.env.FRONTEND_URL, process.env.FRONTEND_URL_DEV],
    credentials: true,
  });
}

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);

  import('./config/mailer.js').then(({ default: transporter }) => {
    transporter.verify((err) => {
      if (err) console.error('Mailer not ready:', err.message);
      else console.log('Mailer ready');
    });
  });
});