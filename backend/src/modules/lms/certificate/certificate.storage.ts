import minioClient, {
  MINIO_BUCKET,
} from "../../../config/minio";

export async function uploadCertificate(
  storageKey: string,
  pdf: Buffer
) {
  await minioClient.putObject(
    MINIO_BUCKET,
    storageKey,
    pdf,
    pdf.length,
    {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${storageKey
        .split("/")
        .pop()}"`,
    }
  );
}

export async function getCertificateStream(
  storageKey: string
) {
  return minioClient.getObject(
    MINIO_BUCKET,
    storageKey
  );
}

export async function getCertificateDownloadUrl(
  storageKey: string
) {
  return minioClient.presignedGetObject(
    MINIO_BUCKET,
    storageKey,
    300
  );
}