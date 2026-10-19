/**
 * Provider contract for provider-specific Aadhaar, education, employment and address adapters.
 * Each implementation must follow the selected provider's official documentation.
 * Do not implement these checks as successful by default or use a generic unverified endpoint.
 */
export type BgvExternalCheckType = "AADHAAR" | "EDUCATION" | "EMPLOYMENT" | "ADDRESS";

export type NormalizedProviderResult = {
  provider: string;
  verified: boolean | null;
  transactionId?: string | null;
  summary: Record<string, string | number | boolean | null>;
};

export interface BgvProviderAdapter<TInput = unknown> {
  readonly type: BgvExternalCheckType;
  verify(input: TInput): Promise<NormalizedProviderResult>;
}

/**
 * Deliberately fails closed until a real, approved adapter is registered.
 * This prevents a configured vendor toggle from being mistaken for a successful check.
 */
export function getUnconfiguredProviderMessage(type: BgvExternalCheckType): string {
  const envName: Record<BgvExternalCheckType, string> = {
    AADHAAR: "BGV_AADHAAR_PROVIDER",
    EDUCATION: "BGV_EDUCATION_PROVIDER",
    EMPLOYMENT: "BGV_EMPLOYMENT_PROVIDER",
    ADDRESS: "BGV_ADDRESS_PROVIDER",
  };
  return `${type} provider adapter is not implemented. Select an authorized provider, configure ${envName[type]}, and implement its documented API contract before enabling automated checks.`;
}
