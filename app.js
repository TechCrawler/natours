const path = require(`path`);
const express = require('express');
const morgan = require('morgan');

const helmet = require(`helmet`);
const rateLimit = require(`express-rate-limit`);
const mongoSanitize = require('express-mongo-sanitize');

const hpp = require(`hpp`);
const xss = require(`xss-clean`);

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const reviewRouter = require(`./routes/reviewRoutes`);
const viewRouter = require(`./routes/viewRoutes`);

const bookingRouter = require(`./routes/bookingRoutes`);
const cookieParser = require(`cookie-parser`);

// Starting express application
const app = express();

// Global Middlewares

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serving static Files
app.use(express.static(path.join(__dirname, 'public')));

// Set Http Security Headers
app.use(helmet());

//  Set limits for IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 100,
  message: `Woo!! To many requests from this IP , Please try after 1 - hour`,
});

app.use(`/api`, limiter);

//Development Logging
if (process.env.NODE_ENV) app.use(morgan('dev'));

// Body Parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Cookie Parser
app.use(cookieParser());

// DATA SANITIZATION against NOSQL query Injection
app.use(mongoSanitize());

//  DATA SANITIZATION against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['duration', 'ratingsQunatity', 'ratingsAverage'],
  })
);

// Routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // const err = new Error(`Cannot find ${req.originalUrl} on the server`);
  // err.statusCode = 404;
  // err.status = 'fail';
  next(new AppError(`Cannot find ${req.originalUrl} on the server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
