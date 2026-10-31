import { describe, expect, it } from "vitest";
import { trace } from "./engine";
import { realJS } from "./engine/realjs";
import { PAGE_EXAMPLES } from "./examples";

describe("page examples match real JavaScript", () => {
  for (const [name, code] of PAGE_EXAMPLES)
    it(name, async () => {
      const r = trace(code);
      expect(r.err).toBeUndefined();
      expect(r.steps.at(-1)!.out).toEqual(await realJS(code));
    });
});
