// JSON 404 for unknown /api routes.
const notFound = (req, res) => {
  res.status(404).json({ message: 'Not found' });
};

// Central error handler. Express 5 forwards rejected promises from async
// handlers here, so controllers do not need their own try/catch.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // body-parser errors (malformed JSON, payload too large)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }

  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({ message: (first && first.message) || 'Invalid data' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path || 'value'}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value' });
  }

  const status = err.status || err.statusCode;
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ message: err.message });
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', err);
  }
  return res.status(500).json({ message: 'Server error' });
};

module.exports = { notFound, errorHandler };
