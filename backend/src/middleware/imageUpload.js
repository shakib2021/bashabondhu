const multer = require('multer');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function createImageUploadMiddleware({
  maxFileSize,
  maxFiles,
  maxFields,
  maxFieldSize,
  fileFields,
  fieldName,
  fileSizeErrorMessage,
  uploadErrorMessage,
  invalidTypeMessage,
}) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fields: maxFields,
      fieldSize: maxFieldSize,
    },
    fileFilter(req, file, callback) {
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        callback(new Error(invalidTypeMessage));
        return;
      }
      callback(null, true);
    },
  });
  const parseUpload = fileFields
    ? upload.fields(fileFields)
    : upload.array(fieldName, maxFiles);

  return (req, res, next) => {
    parseUpload(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({
          success: false,
          message: error.code === 'LIMIT_FILE_SIZE' ? fileSizeErrorMessage : uploadErrorMessage,
        });
      }
      if (error.message === invalidTypeMessage) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return next(error);
    });
  };
}

module.exports = { createImageUploadMiddleware };
