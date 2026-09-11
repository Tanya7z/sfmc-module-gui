import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { catalogDemoData, catalogEcho } from "../sapi/src/catalog-data.ts";

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}

function collect(value: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, visit);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const node = value as Record<string, unknown>;
  visit(node);
  for (const item of Object.values(node)) collect(item, visit);
}

test("控件目录覆盖全部已接线的节点、触发器和效果", () => {
  const feature = readJson("../sapi/src/ui/feature.ui.json") as {
    screens: Array<{ file: string }>;
  };
  const screens = feature.screens.map((item) =>
    readJson(`../sapi/src/ui/${item.file}`),
  );

  const types = new Set<string>();
  const triggers = new Set<string>();
  const effects = new Set<string>();
  for (const screen of screens) {
    collect(screen, (node) => {
      if (typeof node.id === "string" && typeof node.type === "string") {
        types.add(node.type);
      }
      if (typeof node.effect === "string") effects.add(node.effect);
      if (
        node.trigger &&
        typeof node.trigger === "object" &&
        !Array.isArray(node.trigger) &&
        typeof (node.trigger as { type?: unknown }).type === "string"
      ) {
        triggers.add((node.trigger as { type: string }).type);
      }
    });
  }

  assert.deepEqual(
    [...types].sort(),
    [
      "button",
      "divider",
      "dropdown",
      "each",
      "header",
      "image",
      "info",
      "slider",
      "spacer",
      "text",
      "textField",
      "toggle",
      "when",
    ],
  );
  assert.deepEqual([...triggers].sort(), [
    "action",
    "back",
    "close",
    "navigate",
    "refresh",
    "replace",
  ]);
  assert.deepEqual([...effects].sort(), [
    "back",
    "close",
    "message",
    "navigate",
    "refresh",
    "replace",
    "setState",
  ]);
});

test("目录示例数据可供 each 与 image 使用", () => {
  const demo = catalogDemoData();
  assert.equal(typeof demo.imagePack, "string");
  assert.equal(typeof demo.imageSrc, "string");
  assert.ok(Array.isArray(demo.items) && demo.items.length > 0);
  assert.deepEqual(catalogEcho({ text: "hi" }), { ok: true, message: "hi" });
});
