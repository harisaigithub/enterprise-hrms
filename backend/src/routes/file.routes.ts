import { Router, Request, Response } from "express";
import minioClient, {
    MINIO_BUCKET,
} from "../config/minio";

const router = Router();

router.get(
    "/lms/*",
    async (req: Request, res: Response) => {
        try {
            const objectName =
                `lms/${req.params[0]}`;

            const stat =
                await minioClient.statObject(
                    MINIO_BUCKET,
                    objectName
                );

            const stream =
                await minioClient.getObject(
                    MINIO_BUCKET,
                    objectName
                );

            const contentType =
                stat.metaData?.["content-type"];

            if (contentType) {
                res.setHeader(
                    "Content-Type",
                    contentType
                );
            }

            res.setHeader(
                "Content-Length",
                stat.size.toString()
            );

            res.setHeader(
                "Cross-Origin-Resource-Policy",
                "cross-origin"
            );

            stream.pipe(res);
        } catch (error) {
            console.error(
                "MinIO file retrieval error:",
                error
            );

            return res.status(404).json({
                success: false,
                message: "File not found",
            });
        }
    }
);

export default router;