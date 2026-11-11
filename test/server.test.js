import test from "node:test";
import assert from "node:assert/strict";

test("project metadata declares a modern Node runtime", async () => {
  const pkg = await import("../package.json", { with: { type: "json" } });
  assert.match(pkg.default.engines.node, /20/);
});
