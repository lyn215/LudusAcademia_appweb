import { describe, expect, it } from "vitest";

import { mapHttpError } from "../../src/lib/httpErrors";

describe("mapHttpError", () => {
  it("mapea 401", () => {
    const err = mapHttpError(401, { detail: "JWT invalido" });
    expect(err.message).toContain("Sesion");
  });

  it("mapea 503 con retry", () => {
    const err = mapHttpError(503, { detail: "Error interno", retry_after_seconds: 900 });
    expect(err.retryAfterSeconds).toBe(900);
  });
});
