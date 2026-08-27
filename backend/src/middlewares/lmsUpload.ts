import multer from "multer";

// =====================================================
// MEMORY STORAGE
// File temporary memory mein rahegi.
// Service is buffer ko MinIO mein upload karegi.
// =====================================================

const storage = multer.memoryStorage();

// =====================================================
// COURSE CONTENT: PDF + VIDEO
// =====================================================

const allowedMimeTypes = new Set([
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(
      new Error(
        "Only PDF, MP4, WebM and MOV files are allowed"
      )
    );

    return;
  }

  cb(null, true);
};

// =====================================================
// THUMBNAIL: JPG + JPEG + PNG + WEBP
// =====================================================

const thumbnailMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const thumbnailFileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (!thumbnailMimeTypes.has(file.mimetype)) {
    cb(
      new Error(
        "Only JPG, JPEG, PNG and WebP images are allowed"
      )
    );

    return;
  }

  cb(null, true);
};

// =====================================================
// LMS UPLOAD
// PDF / VIDEO
// =====================================================

export const lmsUpload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

// =====================================================
// THUMBNAIL UPLOAD
// IMAGE ONLY
// =====================================================

export const thumbnailUpload = multer({
  storage,
  fileFilter: thumbnailFileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});