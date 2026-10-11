import type { Request, Response, NextFunction } from "express";

import {
    activateBgvPackage,
    createBgvPackage,
    createBgvPackageCheck,
    deactivateBgvPackage,
    deleteBgvPackage,
    deleteBgvPackageCheck,
    getBgvPackage,
    getBgvPackageCheck,
    listBgvPackageChecks,
    listBgvPackages,
    replaceBgvPackageChecks,
    updateBgvPackage,
    updateBgvPackageCheck,
} from "./bgv.package.service";

export async function getBgvPackageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getBgvPackage(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function listBgvPackagesController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const active =
            req.query.active === undefined
                ? undefined
                : req.query.active === "true";

        return res.status(200).json(
            await listBgvPackages(active)
        );
    } catch (error) {
        return next(error);
    }
}

export async function createBgvPackageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(201).json(
            await createBgvPackage(req.body)
        );
    } catch (error) {
        return next(error);
    }
}

export async function updateBgvPackageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await updateBgvPackage(
                req.params.id,
                req.body
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function activateBgvPackageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await activateBgvPackage(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function deactivateBgvPackageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await deactivateBgvPackage(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function deleteBgvPackageController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await deleteBgvPackage(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function listBgvPackageChecksController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await listBgvPackageChecks(req.params.packageId)
        );
    } catch (error) {
        return next(error);
    }
}

export async function getBgvPackageCheckController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getBgvPackageCheck(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function createBgvPackageCheckController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(201).json(
            await createBgvPackageCheck(req.body)
        );
    } catch (error) {
        return next(error);
    }
}

export async function updateBgvPackageCheckController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await updateBgvPackageCheck(
                req.params.id,
                req.body
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function deleteBgvPackageCheckController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await deleteBgvPackageCheck(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function replaceBgvPackageChecksController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await replaceBgvPackageChecks(
                req.params.packageId,
                req.body.checks
            )
        );
    } catch (error) {
        return next(error);
    }
}
