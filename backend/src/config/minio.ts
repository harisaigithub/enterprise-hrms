import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export const MINIO_BUCKET =
  process.env.MINIO_BUCKET || "hrms-uploads";

export async function ensureMinioBucket() {
  const exists =
    await minioClient.bucketExists(MINIO_BUCKET);

  if (!exists) {
    await minioClient.makeBucket(MINIO_BUCKET);
  }
}

export default minioClient;