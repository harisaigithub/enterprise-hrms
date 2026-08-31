import { z } from "zod";

export const addInventorySchema =
  z.object({
    serial: z.string().min(1),
    category: z.string().min(1),
    make: z.string().optional(),
    model: z.string().optional(),
    seats: z.number().optional(),
    licenseExpiry: z.string().nullable().optional(),
  });

export const raiseRequestSchema =
  z.object({
    employeeId: z.string().min(1),
    category: z.string().min(1),
    justification: z.string().min(1),
  });

export const fulfillRequestSchema =
  z.object({
    assetId: z.string().nullable().optional(),
  });

export const acknowledgeSchema =
  z.object({
    employeeId: z.string().min(1),
  });

export const returnAssetSchema =
  z.object({
    condition: z.enum([
      "Good",
      "Damaged",
    ]),

    wipeCompleted: z.boolean(),
  });