import { Client } from "minio";

const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
const minioPort = Number(process.env.MINIO_PORT || 9000);
const minioUseSSL = process.env.MINIO_USE_SSL === "true";
const minioCredentials = {
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
};

const minioClient = new Client({
  endPoint: minioEndpoint,
  port: minioPort,
  useSSL: minioUseSSL,
  ...minioCredentials,
});

const publicMinioClient = new Client({
  endPoint: process.env.MINIO_PUBLIC_ENDPOINT || minioEndpoint,
  port: Number(process.env.MINIO_PUBLIC_PORT || minioPort),
  useSSL: process.env.MINIO_PUBLIC_USE_SSL === "true" || minioUseSSL,
  ...minioCredentials,
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

export { publicMinioClient };

export function deleteMinioObject(objectName: string) {
  return minioClient.removeObject(MINIO_BUCKET, objectName);
}

export default minioClient;