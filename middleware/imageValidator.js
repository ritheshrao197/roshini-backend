const path = require("path");

/**
 * Validates a single file object.
 * @param {object} file - Multer file object.
 * @returns {{isValid: boolean, message?: string}}
 */
function validateImageFile(file) {
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!file.originalname) {
    return { isValid: false, message: "File name is missing" };
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  const size = file.size;

  // Validate extension and MIME type
  if (!allowedExts.includes(ext) || !allowedMimeTypes.includes(mime)) {
    return {
      isValid: false,
      message: `Invalid file type for '${file.originalname}'. Only jpg, jpeg, png, and webp are allowed.`,
    };
  }

  // Enforce size limit of 5MB
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (size > maxSize) {
    return {
      isValid: false,
      message: `File '${file.originalname}' exceeds the 5MB size limit.`,
    };
  }

  return { isValid: true };
}

/**
 * Middleware to validate images uploaded via Multer (single or array).
 */
function imageValidationMiddleware(req, res, next) {
  const filesToValidate = [];

  if (req.file) {
    filesToValidate.push(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToValidate.push(...req.files);
    } else if (typeof req.files === "object") {
      Object.values(req.files).forEach((fieldFiles) => {
        if (Array.isArray(fieldFiles)) {
          filesToValidate.push(...fieldFiles);
        } else {
          filesToValidate.push(fieldFiles);
        }
      });
    }
  }

  for (const file of filesToValidate) {
    const check = validateImageFile(file);
    if (!check.isValid) {
      // If diskStorage was used, clean up the invalid file locally
      const fs = require("fs");
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error(`Failed to clean up invalid upload file ${file.path}:`, e);
        }
      }

      return res.status(400).json({
        success: false,
        message: check.message,
        code: "IMAGE_VALIDATION_ERROR",
      });
    }
  }

  next();
}

module.exports = imageValidationMiddleware;
