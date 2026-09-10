export function maskBankAccount(value: string): string {
  if (!value) return "-";

  const clean = value.replace(/\s/g, "");

  if (clean.length <= 4) {
    return "XXXX";
  }

  return `XXXX XXXX ${clean.slice(-4)}`;
}

export function maskPAN(value: string): string {
  if (!value) return "-";

  if (value.length <= 4) {
    return "XXXXXXXXXX";
  }

  return `${value.slice(0, 4)}******${value.slice(-1)}`;
}

export function maskUAN(value: string): string {
  if (!value) return "-";

  if (value.length <= 4) {
    return "XXXXXXXX";
  }

  return `******${value.slice(-4)}`;
}

export function maskPFAccount(value: string): string {
  if (!value) return "-";

  if (value.length <= 4) {
    return "XXXXXXXX";
  }

  return `****${value.slice(-4)}`;
}

// ─────────────────────────────────────────────
// Company sensitive identifier masking
// ─────────────────────────────────────────────

export function maskCIN(value: string): string {
  if (!value) return "-";

  const clean = value.replace(/\s/g, "");

  if (clean.length <= 6) {
    return "XXXXXXXXXXXXXXX";
  }

  return `${clean.slice(0, 6)}***************`;
}

export function maskGSTIN(value: string): string {
  if (!value) return "-";

  const clean = value.replace(/\s/g, "");

  if (clean.length <= 4) {
    return "XXXXXXXXXXXXXXXX";
  }

  return `${clean.slice(0, 4)}***********${clean.slice(-2)}`;
}

export function maskPFRegistration(value: string): string {
  if (!value) return "-";

  const clean = value.replace(/\s/g, "");

  if (clean.length <= 4) {
    return "XXXXXXXX";
  }

  return `********${clean.slice(-4)}`;
}

export function maskESICRegistration(value: string): string {
  if (!value) return "-";

  const clean = value.replace(/\s/g, "");

  if (clean.length <= 4) {
    return "XXXXXXXX";
  }

  return `***********${clean.slice(-4)}`;
}