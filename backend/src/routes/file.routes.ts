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

router.get(
    "/leave/*",
    async (req: Request, res: Response) => {
        try {
            const fileName = req.params[0];

            const objectName =
                `leave/documents/${fileName}`;

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
                "Content-Disposition",
                "inline"
            );

            res.setHeader(
                "Cross-Origin-Resource-Policy",
                "cross-origin"
            );

            stream.pipe(res);

        } catch (error) {
            console.error(
                "MinIO Leave document retrieval error:",
                error
            );

            return res.status(404).json({
                success: false,
                message: "Leave document not found",
            });
        }
    }
);

router.get(
    "/candidate/*",
    async (req: Request, res: Response) => {
        try {
            const fileName = req.params[0];

            const objectName =
                `candidate/documents/${fileName}`;

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
                "Content-Disposition",
                "inline"
            );

            res.setHeader(
                "Cross-Origin-Resource-Policy",
                "cross-origin"
            );

            stream.pipe(res);
        } catch (error) {
            console.error(
                "MinIO Candidate document retrieval error:",
                error
            );

            return res.status(404).json({
                success: false,
                message: "Candidate document not found",
            });
        }
    }
);

router.get(
  "/payroll/*",
  async (req: Request, res: Response) => {
    try {
      const fileName = req.params[0];

      const objectName = `payroll/payslips/${fileName}`;

      const stat = await minioClient.statObject(
        MINIO_BUCKET,
        objectName
      );

      const stream = await minioClient.getObject(
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
        "Content-Disposition",
        "inline"
      );

      res.setHeader(
        "Cross-Origin-Resource-Policy",
        "cross-origin"
      );

      stream.pipe(res);
    } catch (error) {
      console.error(
        "MinIO Payroll payslip retrieval error:",
        error
      );

      return res.status(404).json({
        success: false,
        message: "Payslip not found",
      });
    }
  }
);

export default router;