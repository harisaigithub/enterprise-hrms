import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(
      new Error(
        "Only PDF, JPG and PNG files are allowed"
      )
    );
    return;
  }

  cb(null, true);
};

export const leaveDocumentUpload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});