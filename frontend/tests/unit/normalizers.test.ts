import { describe, expect, it } from "vitest";

import { normalizeLinkCode } from "../../src/utils/normalizers";

describe("normalizeLinkCode", () => {
  it("normaliza a mayusculas y 6 caracteres", () => {
    expect(normalizeLinkCode(" ludu42 ")).toBe("LUDU42");
    expect(normalizeLinkCode("abcdefghi")).toBe("ABCDEF");
  });
});
