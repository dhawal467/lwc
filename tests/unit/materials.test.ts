import { describe, it, expect } from "vitest";
import {
  parseMaterialsChecklist,
  serializeMaterialsChecklist,
  hasUnverifiedMaterials,
  MaterialChecklistItem,
} from "@/lib/materials";

describe("materials checklist utility", () => {
  describe("parseMaterialsChecklist", () => {
    it("returns empty array for null, undefined, and empty string", () => {
      expect(parseMaterialsChecklist(null)).toEqual([]);
      expect(parseMaterialsChecklist(undefined)).toEqual([]);
      expect(parseMaterialsChecklist("")).toEqual([]);
      expect(parseMaterialsChecklist("   ")).toEqual([]);
      expect(parseMaterialsChecklist(123)).toEqual([]);
      expect(parseMaterialsChecklist({})).toEqual([]);
    });

    it("parses valid JSON checklist items array cleanly", () => {
      const items: MaterialChecklistItem[] = [
        { id: "mat-1", name: "Drawer Channels 18 inch", quantity: "4 sets", verified: true },
        { id: "mat-2", name: "Soft close hinges", quantity: "12 pcs", verified: false },
      ];
      const jsonStr = JSON.stringify(items);
      const parsed = parseMaterialsChecklist(jsonStr);

      expect(parsed).toEqual(items);
    });

    it("preserves verified boolean and optional quantity from JSON", () => {
      const jsonStr = JSON.stringify([
        { id: "mat-1", name: "Brass Handles", verified: true },
        { id: "mat-2", name: "Fevicol Marine", quantity: "2 kg", verified: false },
      ]);
      const parsed = parseMaterialsChecklist(jsonStr);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        id: "mat-1",
        name: "Brass Handles",
        quantity: undefined,
        verified: true,
      });
      expect(parsed[1]).toEqual({
        id: "mat-2",
        name: "Fevicol Marine",
        quantity: "2 kg",
        verified: false,
      });
    });

    it("handles already parsed array input", () => {
      const raw = [
        { id: "mat-1", name: "Plywood 18mm", quantity: "2 sheets", verified: true },
      ];
      const parsed = parseMaterialsChecklist(raw);
      expect(parsed).toEqual([
        { id: "mat-1", name: "Plywood 18mm", quantity: "2 sheets", verified: true },
      ]);
    });

    it("handles JSON array of strings", () => {
      const raw = JSON.stringify(["Hinges", "Screws"]);
      const parsed = parseMaterialsChecklist(raw);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("Hinges");
      expect(parsed[0].verified).toBe(false);
      expect(parsed[1].name).toBe("Screws");
      expect(parsed[1].verified).toBe(false);
    });

    it("parses plain text line-by-line fallback into unverified items", () => {
      const rawText = "Teak wood 3x2 - 10ft\nHettich hinges 8 pairs\nBlack matte handles 4 pcs";
      const parsed = parseMaterialsChecklist(rawText);

      expect(parsed).toHaveLength(3);
      expect(parsed[0].name).toBe("Teak wood 3x2 - 10ft");
      expect(parsed[0].verified).toBe(false);
      expect(typeof parsed[0].id).toBe("string");
      expect(parsed[0].id.length).toBeGreaterThan(0);

      expect(parsed[1].name).toBe("Hettich hinges 8 pairs");
      expect(parsed[1].verified).toBe(false);

      expect(parsed[2].name).toBe("Black matte handles 4 pcs");
      expect(parsed[2].verified).toBe(false);
    });

    it("handles Windows CRLF and ignores empty lines in fallback parsing", () => {
      const rawText = "Item 1\r\n\r\nItem 2  \r\n\r\n  Item 3\r\n";
      const parsed = parseMaterialsChecklist(rawText);

      expect(parsed).toHaveLength(3);
      expect(parsed.map((p) => p.name)).toEqual(["Item 1", "Item 2", "Item 3"]);
      expect(parsed.every((p) => !p.verified)).toBe(true);
    });
  });

  describe("serializeMaterialsChecklist", () => {
    it("serializes items array to JSON string", () => {
      const items: MaterialChecklistItem[] = [
        { id: "1", name: "Hinges", quantity: "2", verified: true },
      ];
      const serialized = serializeMaterialsChecklist(items);
      expect(typeof serialized).toBe("string");
      expect(JSON.parse(serialized)).toEqual(items);
    });

    it("serializes empty array to '[]'", () => {
      expect(serializeMaterialsChecklist([])).toBe("[]");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(serializeMaterialsChecklist(null as any)).toBe("[]");
    });

    it("round-trips cleanly through serialization and parsing", () => {
      const items: MaterialChecklistItem[] = [
        { id: "101", name: "Wood Stain Dark Walnut", quantity: "1L", verified: true },
        { id: "102", name: "Clear PU Coat", quantity: "2L", verified: false },
      ];
      const serialized = serializeMaterialsChecklist(items);
      const roundTripped = parseMaterialsChecklist(serialized);
      expect(roundTripped).toEqual(items);
    });
  });

  describe("hasUnverifiedMaterials", () => {
    it("returns false for empty lists, null, and undefined", () => {
      expect(hasUnverifiedMaterials(null)).toBe(false);
      expect(hasUnverifiedMaterials(undefined)).toBe(false);
      expect(hasUnverifiedMaterials("")).toBe(false);
      expect(hasUnverifiedMaterials("[]")).toBe(false);
      expect(hasUnverifiedMaterials([])).toBe(false);
    });

    it("returns false when all items are verified", () => {
      const items: MaterialChecklistItem[] = [
        { id: "1", name: "Glass 8mm", verified: true },
        { id: "2", name: "Silicone sealant", verified: true },
      ];
      expect(hasUnverifiedMaterials(items)).toBe(false);
      expect(hasUnverifiedMaterials(JSON.stringify(items))).toBe(false);
    });

    it("returns true when at least one item is unverified", () => {
      const partiallyVerified: MaterialChecklistItem[] = [
        { id: "1", name: "Glass 8mm", verified: true },
        { id: "2", name: "Silicone sealant", verified: false },
      ];
      expect(hasUnverifiedMaterials(partiallyVerified)).toBe(true);
      expect(hasUnverifiedMaterials(JSON.stringify(partiallyVerified))).toBe(true);
    });

    it("returns true when all items are unverified", () => {
      const allUnverified: MaterialChecklistItem[] = [
        { id: "1", name: "Item A", verified: false },
        { id: "2", name: "Item B", verified: false },
      ];
      expect(hasUnverifiedMaterials(allUnverified)).toBe(true);
      expect(hasUnverifiedMaterials(JSON.stringify(allUnverified))).toBe(true);
    });

    it("returns true for plain-text fallback lists", () => {
      expect(hasUnverifiedMaterials("Hinges\nScrews")).toBe(true);
    });
  });
});
