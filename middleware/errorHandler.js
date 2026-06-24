/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Extract Request ID if attached
  const requestId = req.id || req.headers["x-request-id"] || "N/A";
  
  // Base Error Payload
  let errorResponse = {
    success: false,
    message: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_SERVER_ERROR",
    requestId,
  };

  let statusCode = err.status || 500;

  // 1. Zod Validation Error Handler
  if (err.name === "ZodError") {
    statusCode = 400;
    errorResponse.code = "VALIDATION_ERROR";
    errorResponse.message = "Request validation failed";
    errorResponse.errors = err.errors && Array.isArray(err.errors) 
      ? err.errors.map((e) => ({
          field: e.path ? e.path.join(".") : "unknown",
          message: e.message,
        }))
      : [{ message: err.message }];
  }
  // 2. Mongoose Cast Error (e.g. invalid ObjectId)
  else if (err.name === "CastError") {
    statusCode = 400;
    errorResponse.code = "CAST_ERROR";
    errorResponse.message = `Invalid ${err.path}: ${err.value}`;
  }
  // 3. Mongoose Validation Error
  else if (err.name === "ValidationError") {
    statusCode = 400;
    errorResponse.code = "DB_VALIDATION_ERROR";
    errorResponse.message = "Database validation failed";
    errorResponse.errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }
  // 4. Mongoose Duplicate Key Error (Code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    errorResponse.code = "DUPLICATE_KEY_ERROR";
    const duplicateField = Object.keys(err.keyValue || {})[0] || "field";
    errorResponse.message = `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists`;
  }
  // 5. Connect Timeout Error
  else if (err.timeout) {
    statusCode = 503;
    errorResponse.code = "REQUEST_TIMEOUT";
    errorResponse.message = "Request took too long to respond. Please try again.";
  }

  // Under development, expose stack trace. Under production, suppress stack.
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  // Structured Logging of error via Pino (if initialized)
  if (req.log) {
    req.log.error({ err, requestId }, `[ErrorHandler] Caught error: ${errorResponse.message}`);
  } else {
    console.error(`[ErrorHandler] Error ID ${requestId}:`, err);
  }

  return res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
