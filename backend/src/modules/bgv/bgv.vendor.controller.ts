import type { Request, Response, NextFunction } from "express";

import {
  activateBgvVendor,
  countBgvVendors,
  createBgvVendor,
  deactivateBgvVendor,
  deleteBgvVendor,
  disableBgvVendorApi,
  enableBgvVendorApi,
  getBgvVendor,
  listBgvVendors,
  updateBgvVendor,
} from "./bgv.vendor.service";

export async function getBgvVendorController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await getBgvVendor(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function listBgvVendorsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const active =
      req.query.active === undefined
        ? undefined
        : req.query.active === "true";

    const apiEnabled =
      req.query.apiEnabled === undefined
        ? undefined
        : req.query.apiEnabled === "true";

    const page =
      req.query.page === undefined
        ? undefined
        : Number(req.query.page);

    const limit =
      req.query.limit === undefined
        ? undefined
        : Number(req.query.limit);

    return res.status(200).json(
      await listBgvVendors({
        active,
        apiEnabled,
        search:
          typeof req.query.search === "string"
            ? req.query.search
            : undefined,
        page,
        limit,
      })
    );
  } catch (error) {
    return next(error);
  }
}

export async function createBgvVendorController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(201).json(await createBgvVendor(req.body));
  } catch (error) {
    return next(error);
  }
}

export async function updateBgvVendorController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res
      .status(200)
      .json(await updateBgvVendor(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

export async function activateBgvVendorController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await activateBgvVendor(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function deactivateBgvVendorController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await deactivateBgvVendor(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function enableBgvVendorApiController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await enableBgvVendorApi(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function disableBgvVendorApiController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await disableBgvVendorApi(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function deleteBgvVendorController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await deleteBgvVendor(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function countBgvVendorsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const active =
      req.query.active === undefined
        ? undefined
        : req.query.active === "true";

    return res.status(200).json(await countBgvVendors(active));
  } catch (error) {
    return next(error);
  }
}
