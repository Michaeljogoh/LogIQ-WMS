export type WarehouseAssignment = {
  warehouseId: string;
  permissions: string[];
};

export function parseWarehouseAssignments(
  value: unknown,
): WarehouseAssignment[] {
  if (!value || typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is WarehouseAssignment => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const candidate = entry as Record<string, unknown>;
      return (
        typeof candidate.warehouseId === "string" &&
        Array.isArray(candidate.permissions) &&
        candidate.permissions.every((perm) => typeof perm === "string")
      );
    });
  } catch {
    return [];
  }
}
