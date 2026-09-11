import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("gui manifest 只公开声明式页面能力，不包含主菜单能力", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../sapi/manifest.json", import.meta.url), "utf8"),
  ) as { services: { provides: Array<{ name: string }> } };
  const names = manifest.services.provides.map((item) => item.name);
  assert.ok(names.includes("gui.registerFeature"));
  assert.ok(names.includes("gui.openScreen"));
  assert.ok(!names.includes("gui.registerMenuItem"));
  assert.ok(!names.includes("gui.openMainMenu"));
});
