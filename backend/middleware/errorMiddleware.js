// Express 5 forwards rejected promises from async handlers here.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Something went wrong';

  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('. ');
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'production' || status < 500 ? {} : { stack: err.stack })
  });
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Not found: ${req.method} ${req.path}` });
};

module.exports = { errorHandler, notFound };
