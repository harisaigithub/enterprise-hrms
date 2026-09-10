import fs from "fs";
import path from "path";
import crypto from "crypto";
import minioClient, { MINIO_BUCKET } from "../config/minio";

const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

// Ensure upload directories exist
export function ensureUploadDirs() {
  const dirs = [
    path.join(UPLOADS_ROOT, "avatars"),
    path.join(UPLOADS_ROOT, "documents"),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

ensureUploadDirs();

export interface SavedFileResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Save an uploaded file to local disk (under /uploads/{folder})
 * and synchronously/asynchronously mirror to MinIO if available.
 */
export async function saveUploadedFile(
  folder: "avatars" | "documents",
  file: Express.Multer.File
): Promise<SavedFileResult> {
  ensureUploadDirs();

  const ext = path.extname(file.originalname) || (file.mimetype.includes("png") ? ".png" : ".jpg");
  const uniqueName = `${folder === "avatars" ? "avatar" : "doc"}-${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(UPLOADS_ROOT, folder);
  const targetPath = path.join(targetDir, uniqueName);

  // Write file buffer to local disk
  fs.writeFileSync(targetPath, file.buffer);

  // Mirror to MinIO if MinIO is configured
  const minioObjectName = `${folder}/${uniqueName}`;
  try {
    await minioClient.putObject(
      MINIO_BUCKET,
      minioObjectName,
      file.buffer,
      file.size,
      { "Content-Type": file.mimetype }
    );
  } catch {
    // Non-fatal if MinIO is offline; local file is the reliable primary source
  }

  const fileUrl = `/uploads/${folder}/${uniqueName}`;

  return {
    fileUrl,
    fileName: file.originalname || uniqueName,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
}

/**
 * Delete a previously stored file from disk and MinIO.
 */
export async function deleteStoredFile(fileUrl: string): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;

  const relativePath = fileUrl.replace(/^\/uploads\//, "");
  const localPath = path.join(UPLOADS_ROOT, relativePath);

  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      // Ignore deletion errors
    }
  }

  try {
    await minioClient.removeObject(MINIO_BUCKET, relativePath);
  } catch {
    // Ignore MinIO deletion errors
  }
}
