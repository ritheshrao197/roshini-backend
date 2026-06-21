/**
 * Zod validation middleware helper
 * Validate inputs in req.body, req.query, or req.params.
 * 
 * @param {import("zod").ZodSchema} schema - Zod Schema definition
 * @param {"body" | "query" | "params"} [source="body"] - Request segment to validate
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Replace with validated/cleaned fields
      next();
    } catch (err) {
      next(err); // Forwards ZodError to errorHandler middleware
    }
  };
};

module.exports = validate;
