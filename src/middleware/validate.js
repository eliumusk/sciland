const { ZodError } = require('zod');
const { BadRequestError } = require('../utils/errors');

function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new BadRequestError('invalid request body', error.issues));
      }
      return next(error);
    }
  };
}

module.exports = { validateBody };
