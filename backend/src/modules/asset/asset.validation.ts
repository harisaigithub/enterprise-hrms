import { z } from "zod";

const optionalString = z.string().trim().optional().nullable();
const optionalPositiveInt = z.union([
  z.number().int().min(1),
  z.string().trim().refine((value) => value !== "" && Number.isInteger(Number(value)) && Number(value) > 0, {
    message: "Must be a positive integer",
  }),
]).transform((value) => Number(value));

export const addInventorySchema = z.object({
  serial: z.string().min(1),
  category: z.string().min(1),
  make: optionalString,
  model: optionalString,
  status: z.string().optional(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCost: z.union([
    z.number(),
    z.string().trim().transform((value) => Number(value)),
  ]).optional().nullable(),
  location: optionalString,
  warrantyExpiry: z.string().optional().nullable(),
  vendor: optionalString,
  conditionNotes: optionalString,
  seats: z.number().int().min(1).optional(),
  licenseExpiry: z.string().nullable().optional(),
}).passthrough();

export const updateInventorySchema = z.object({
  make: optionalString,
  model: optionalString,
  location: optionalString,
  vendor: optionalString,
  conditionNotes: optionalString,
  warrantyExpiry: z.string().nullable().optional(),
  purchaseCost: z.union([
    z.number().min(0),
    z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Purchase cost must be a non-negative amount with at most two decimal places").transform(Number),
  ]).nullable().optional(),
}).strict();

export const assignAssetSchema = z.object({
  employeeId: z.string().uuid(),
}).strict();

export const retireAssetSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();

export const raiseRequestSchema = z.object({
  employeeId: z.string().min(1).optional(),
  category: z.string().min(1),
  justification: z.string().min(1),
  assetType: optionalString,
  model: optionalString,
  quantity: optionalPositiveInt.optional(),
  neededBy: z.string().optional().nullable(),
  requestType: z.enum(["New", "Replacement"]).optional(),
  deliveryLocation: optionalString,
  replacementAssetId: z.string().min(1).optional().nullable(),
  costCenter: optionalString,
  estimatedCost: z.union([
    z.number().min(0),
    z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Estimated cost must be a non-negative amount with at most two decimal places").transform(Number),
  ]).nullable().optional(),
  attachmentUrl: optionalString,
}).passthrough();

export const fulfillRequestSchema =
  z.object({
    assetId: z.string().uuid().nullable().optional(),
  }).strict();

export const rejectAssetRequestSchema = z.object({
  reason: z.string().trim().min(1, "A rejection reason is required.").max(1000),
}).strict();

export const acknowledgeSchema =
  z.object({
    employeeId: z.string().min(1),
  });

export const returnAssetSchema =
  z.object({
    condition: z.enum(["Good", "Damaged"]),
    wipeCompleted: z.boolean(),
  }).strict();