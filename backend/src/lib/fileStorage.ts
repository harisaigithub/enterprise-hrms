import path from "path";
import crypto from "crypto";
import fs from "fs";
import { Readable } from "stream";
import minioClient, { MINIO_BUCKET, ensureMinioBucket } from "../config/minio";

export interface SavedFileResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

const LOCAL_UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

/**
 * Save an uploaded file by streaming to MinIO, with automatic local disk fallback if MinIO/Docker is offline.
 */
export async function saveUploadedFile(
  folder: "avatars" | "documents",
  file: Express.Multer.File
): Promise<SavedFileResult> {
  const ext = path.extname(file.originalname) || (file.mimetype.includes("png") ? ".png" : ".jpg");
  const uniqueName = `${folder === "avatars" ? "avatar" : "doc"}-${crypto.randomUUID()}${ext}`;
  const minioObjectName = `${folder}/${uniqueName}`;
  const fileUrl = `/uploads/${folder}/${uniqueName}`;
  const fileSize = file.size || (file.path && fs.existsSync(file.path) ? fs.statSync(file.path).size : 0);

  // 1. Try streaming to MinIO first
  try {
    await ensureMinioBucket();

    let stream: Readable;
    if (file.buffer) {
      stream = Readable.from(file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      stream = fs.createReadStream(file.path);
    } else {
      throw new Error("No file content found");
    }

    await minioClient.putObject(
      MINIO_BUCKET,
      minioObjectName,
      stream,
      fileSize,
      { "Content-Type": file.mimetype || "application/octet-stream" }
    );

    // Cleanup temp multer file if present
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch {}
    }

    return {
      fileUrl,
      fileName: file.originalname || uniqueName,
      fileSize,
      mimeType: file.mimetype,
    };
  } catch (minioErr) {
    // 2. Fallback to local uploads directory when Docker/MinIO is not running
    console.warn("[FileStorage] MinIO offline or unreachable. Falling back to local storage:", (minioErr as Error)?.message);

    const targetDir = path.join(LOCAL_UPLOADS_ROOT, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, uniqueName);

    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, targetPath);
      try { fs.unlinkSync(file.path); } catch {}
    }

    return {
      fileUrl,
      fileName: file.originalname || uniqueName,
      fileSize,
      mimeType: file.mimetype,
    };
  }
}

/**
 * Delete a previously stored file (from MinIO or local fallback).
 */
export async function deleteStoredFile(fileUrl: string): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;

  const relativePath = fileUrl.replace(/^\/uploads\//, "");

  // Attempt MinIO deletion
  try {
    await minioClient.removeObject(MINIO_BUCKET, relativePath);
  } catch {
    // Attempt local file cleanup
    try {
      const localFilePath = path.join(LOCAL_UPLOADS_ROOT, relativePath);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch {}
  }
}