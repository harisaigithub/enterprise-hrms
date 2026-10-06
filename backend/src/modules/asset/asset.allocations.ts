export type LicenseAllocationEvent = {
    assetId: string;
    employeeId: string | null;
    action: string;
};

export function countActiveLicenseAllocations(
    events: readonly LicenseAllocationEvent[]
) {
    const counts = new Map<string, number>();
    for (const event of events) {
        if (!event.employeeId) continue;

        const key = `${event.assetId}:${event.employeeId}`;
        if (event.action === "ASSIGNED") {
            counts.set(key, (counts.get(key) ?? 0) + 1);
        } else if (event.action === "RETURNED") {
            counts.set(key, (counts.get(key) ?? 0) - 1);
        }
    }
    return counts;
}

export function licenseAllocationKey(assetId: string, employeeId: string) {
    return `${assetId}:${employeeId}`;
}