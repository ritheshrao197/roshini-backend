const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Ensure Cloudinary is configured if credentials exist
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads an image file to Cloudinary.
 * @param {string|object} file - A local file path string, a Multer buffer file, or a Multer disk file.
 * @param {string} folder - The destination folder in Cloudinary (e.g., 'products', 'categories').
 * @returns {Promise<{publicId: string, secureUrl: string, width: number, height: number, format: string}>}
 */
async function uploadImage(file, folder) {
  const options = {
    folder: folder,
    resource_type: "image",
    quality: "auto",
    fetch_format: "auto",
  };

  if (!file) {
    throw new Error("No file provided for upload");
  }

  // Case 1: Local file path string
  if (typeof file === "string") {
    const result = await cloudinary.uploader.upload(file, options);
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  }

  // Case 2: Multer memory storage (buffer)
  if (file.buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        }
      });
      
      const readable = new Readable();
      readable._read = () => {};
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(stream);
    });
  }

  // Case 3: Multer disk storage (file.path)
  if (file.path) {
    const result = await cloudinary.uploader.upload(file.path, options);
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  }

  throw new Error("Invalid file format. Must be a path string, buffer, or file object.");
}

/**
 * Deletes an image from Cloudinary.
 * @param {string} publicId - The Cloudinary public ID.
 * @returns {Promise<object>}
 */
async function deleteImage(publicId) {
  if (!publicId) return null;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Replaces an existing image on Cloudinary with a new one.
 * @param {string} oldPublicId - The Cloudinary public ID to delete.
 * @param {string|object} newFile - The new file to upload.
 * @param {string} folder - The destination folder.
 * @returns {Promise<{publicId: string, secureUrl: string, width: number, height: number, format: string}>}
 */
async function replaceImage(oldPublicId, newFile, folder) {
  // 1. Upload new image first to verify it succeeds
  const uploaded = await uploadImage(newFile, folder);

  // 2. Delete old image
  if (oldPublicId) {
    try {
      await deleteImage(oldPublicId);
    } catch (err) {
      console.error(`[CloudinaryService] Failed to delete old image ${oldPublicId}:`, err);
    }
  }

  return uploaded;
}

module.exports = {
  uploadImage,
  deleteImage,
  replaceImage,
  cloudinary,
};
