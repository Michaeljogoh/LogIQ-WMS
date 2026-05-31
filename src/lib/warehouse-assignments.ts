export type WarehouseAssignment = {
  warehouseId: string;
  permissions: ("PICK" | "PACK" | "RECEIVE")[];
};

function isWarehouseAssignment(entry: unknown): entry is WarehouseAssignment {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  const candidate = entry as Record<string, unknown>;
  if (typeof candidate.warehouseId !== "string") {
    return false;
  }
  if (!Array.isArray(candidate.permissions)) {
    return false;
  }
  return candidate.permissions.every(
    (perm) => perm === "PICK" || perm === "PACK" || perm === "RECEIVE",
  );
}

/** Session stores assignments as a JSON string; client may receive string or array. */
export function parseWarehouseAssignments(value: unknown): WarehouseAssignment[] {
  if (!value) {
    return [];
  }

  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isWarehouseAssignment);
}
