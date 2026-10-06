import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

type WorkflowSubmissionDatabase = Pick<typeof prisma, "$transaction">;
type SubmitWorkflow = (
  definitionId: string,
  requesterCode: string,
  attributes: Record<string, unknown>,
  tx: Prisma.TransactionClient
) => Promise<{ data: { id: string } }>;

export async function submitAndLinkWorkflow<T>(input: {
  database?: WorkflowSubmissionDatabase;
  requestType: string;
  requesterCode: string;
  attributes: Record<string, unknown> | ((tx: Prisma.TransactionClient) => Promise<Record<string, unknown>>);
  submitRequest: SubmitWorkflow;
  linkOwner: (tx: Prisma.TransactionClient, workflowInstanceId: string) => Promise<T>;
}): Promise<T> {
  const database = input.database ?? prisma;
  return database.$transaction(async (tx) => {
    const definition = await tx.workflowDefinition.findFirst({
      where: { requestType: input.requestType, status: "Active" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!definition) {
      throw AppError.conflict(`${input.requestType} workflow is not installed. Install it from Workflow Library first.`);
    }
    const attributes = typeof input.attributes === "function" ? await input.attributes(tx) : input.attributes;
    const workflow = await input.submitRequest(definition.id, input.requesterCode, attributes, tx);
    return input.linkOwner(tx, workflow.data.id);
  });
}