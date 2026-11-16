import { describe, expect, it } from "vitest";
import { CueLinkStartRequestSchema, CueSyncDaysRequestSchema } from "@skillhiive/contracts/api/cueSync";
import { CUE_SYNC_DISCLOSURE, disclosedFieldPaths } from "./cueSyncFields";

// The web app does not depend on zod itself, so the schemas are read through their public shape.
interface SchemaNode {
  shape?: Record<string, SchemaNode>;
  element?: SchemaNode;
  unwrap?: () => SchemaNode;
  _def: { schema?: SchemaNode };
}

/** Strip refinements and wrappers until a plain object, array or leaf remains. */
function unwrap(schema: SchemaNode): SchemaNode {
  let current = schema;
  for (;;) {
    if (current._def.schema !== undefined) current = current._def.schema;
    else if (current.shape === undefined && current.element === undefined && typeof current.unwrap === "function") current = current.unwrap();
    else return current;
  }
}

/** Dotted paths of every leaf below an object schema; arrays contribute their element's paths. */
function leafPaths(schema: SchemaNode, prefix = ""): string[] {
  const inner = unwrap(schema);
  if (inner.element !== undefined) return leafPaths(inner.element, prefix);
  if (inner.shape !== undefined) {
    return Object.entries(inner.shape).flatMap(([key, child]) => leafPaths(child, prefix === "" ? key : prefix + "." + key));
  }
  return [prefix];
}

describe("the Privacy page's list of what Cue sends", () => {
  it("names every field of the days request and the link request, and nothing else", () => {
    const wire = [
      ...leafPaths(CueSyncDaysRequestSchema as unknown as SchemaNode),
      ...leafPaths(CueLinkStartRequestSchema as unknown as SchemaNode, "link"),
    ].sort();
    expect(disclosedFieldPaths()).toEqual(wire);
  });

  it("lists each field once and gives each entry some wording", () => {
    const paths = disclosedFieldPaths();
    expect(new Set(paths).size).toBe(paths.length);
    for (const group of CUE_SYNC_DISCLOSURE) {
      expect(group.heading.length).toBeGreaterThan(0);
      for (const item of group.items) expect(item.text.length).toBeGreaterThan(0);
    }
  });
});
