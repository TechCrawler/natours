const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateErrorDB = (err) => {
  const message = `Duplicate field value : ${Object.keys(
    err.keyValue
  )}  . pLease use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const values = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data :: ${values.join('. ')}`;
  return new AppError(message, 400);
};
const handleJWTError = () =>
  new AppError(`Invalid token! Please login again`, 401);

const handleJWTExpError = () =>
  new AppError(`Your token has been expired! Please login again `, 401);

const sendErrorDev = (req, err, res) => {
  // *API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  } else {
    // *RENDERED WEBSITE
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong ',
      msg: err.message,
    });
  }
};

const sendErrorProd = (req, err, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // *API
    if (err.isOperational) {
      err.status = err.status || 'error';
      err.statusCode = err.statusCode || 500;

      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // console.log(`Error 💥 : ${err}`);
      res.status(500).json({
        status: 'error',
        message: 'Something went very Wrong',
      });
    }
  } else {
    if (err.isOperational) {
      res.status(err.statusCode).render('error', {
        title: 'Something went wrong ',
        msg: err.message,
      });
    } else {
      // console.log(`Error 💥 : ${err}`);
      res.status(err.statusCode).render('error', {
        title: 'Something went wrong ',
        msg: 'Please try again later',
      });
    }
  }
};

module.exports = (err, req, res, next) => {
  let error = { ...err };
  error.name = err.name;
  error.message = err.message;
  // console.log(error);
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateErrorDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
  if (error.name === 'TokenExpiredError') error = handleJWTExpError(error);
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(req, error, res);
  } else {
    sendErrorProd(req, error, res);
  }
};
