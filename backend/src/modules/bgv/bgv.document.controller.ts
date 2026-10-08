import type { Request, Response, NextFunction } from "express";

import {
    createBgvDocument,
    deleteBgvDocument,
    expireBgvDocument,
    getBgvDocument,
    listBgvDocuments,
    rejectBgvDocument,
    verifyBgvDocument,
} from "./bgv.document.service";

export async function getBgvDocumentController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getBgvDocument(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function listBgvDocumentsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await listBgvDocuments({
                caseId:
                    req.query.caseId as
                        | string
                        | undefined,

                verificationId:
                    req.query.verificationId as
                        | string
                        | undefined,

                verificationStatus:
                    req.query.verificationStatus as
                        | any
                        | undefined,

                uploadedById:
                    req.query.uploadedById as
                        | string
                        | undefined,

                page: req.query.page
                    ? Number(req.query.page)
                    : undefined,

                limit: req.query.limit
                    ? Number(req.query.limit)
                    : undefined,
            })
        );
    } catch (error) {
        return next(error);
    }
}

export async function createBgvDocumentController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(201).json(
            await createBgvDocument(req.body)
        );
    } catch (error) {
        return next(error);
    }
}

export async function verifyBgvDocumentController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await verifyBgvDocument(
                req.params.id,
                req.body.verifiedById
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function rejectBgvDocumentController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await rejectBgvDocument(
                req.params.id,
                req.body.verifiedById,
                req.body.rejectionReason
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function expireBgvDocumentController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await expireBgvDocument(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function deleteBgvDocumentController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await deleteBgvDocument(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}
