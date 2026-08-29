import express from 'express';
import cors from "cors";
import "dotenv/config";

import authRouter from './modules/auth/auth.routes.js';
import userRouter from './modules/users/users.routes.js';
import classesRouter from './modules/classes/classes.routes.js';
import enrollmentsRouter from './modules/enrollments/enrollments.routes.js';
import assessmentsRouter from './modules/assessments/assessments.routes.js';
import gradesRouter from './modules/grades/grades.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/classes', classesRouter);
app.use('/enrollments', enrollmentsRouter);
app.use('/assessments', assessmentsRouter);
app.use('/grades', gradesRouter);
app.use('/reports', reportsRouter);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const server = app.listen(3000, () => console.log('Servidor rodando na porta 3000'));

server.on('error', (error) => {
  console.error('Server error:', error);
});