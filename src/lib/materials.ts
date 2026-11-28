export interface MaterialChecklistItem {
  id: string;
  order_item_id?: string | null;
  name: string;
  quantity?: string;
  verified: boolean;
}

export function generateMaterialId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeItem(item: unknown): MaterialChecklistItem | null {
  if (!item) return null;

  if (typeof item === "string") {
    const name = item.trim();
    if (!name) return null;
    return {
      id: generateMaterialId(),
      name,
      verified: false,
    };
  }

  if (typeof item === "object") {
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) return null;

    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : generateMaterialId();

    const quantity =
      record.quantity !== undefined &&
      record.quantity !== null &&
      String(record.quantity).trim() !== ""
        ? String(record.quantity).trim()
        : undefined;

    const verified = Boolean(record.verified);

    const order_item_id =
      typeof record.order_item_id === "string" && record.order_item_id.trim()
        ? record.order_item_id.trim()
        : record.order_item_id === null
        ? null
        : undefined;

    const result: MaterialChecklistItem = {
      id,
      name,
      quantity,
      verified,
    };

    if (order_item_id !== undefined) {
      result.order_item_id = order_item_id;
    }

    return result;
  }

  return null;
}

export function parseMaterialsChecklist(raw: unknown): MaterialChecklistItem[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  // If already an array of items
  if (Array.isArray(raw)) {
    return raw
      .map((item) => normalizeItem(item))
      .filter((item): item is MaterialChecklistItem => item !== null);
  }

  if (typeof raw !== "string") {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  // Attempt to parse as JSON first
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeItem(item))
        .filter((item): item is MaterialChecklistItem => item !== null);
    }
  } catch {
    // Not JSON, fallback to line-separated text
  }

  // Fallback: line-separated text
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => ({
    id: generateMaterialId(),
    name: line,
    verified: false,
  }));
}

export function serializeMaterialsChecklist(items: MaterialChecklistItem[]): string {
  if (!Array.isArray(items)) {
    return JSON.stringify([]);
  }
  return JSON.stringify(items);
}

export function hasUnverifiedMaterials(raw: unknown): boolean {
  const items = parseMaterialsChecklist(raw);
  if (items.length === 0) {
    return false;
  }
  return items.some((item) => !item.verified);
}

export function filterMaterialsByItem(
  items: MaterialChecklistItem[],
  orderItemId?: string | null
): MaterialChecklistItem[] {
  if (!orderItemId) return items;
  return items.filter((item) => item.order_item_id === orderItemId);
}
