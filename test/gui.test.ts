import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearRegistries,
  listMenuItems,
  registerMenuItem,
  unregisterMenuItem,
} from "../sapi/src/registry.ts";

describe("gui registry", () => {
  it("register / unregister 菜单项", () => {
    clearRegistries();
    assert.deepEqual(listMenuItems(), []);
    assert.equal(registerMenuItem({ id: "a", title: "A", order: 2 }).ok, true);
    assert.equal(registerMenuItem({ id: "b", title: "B", order: 1 }).ok, true);
    assert.equal(listMenuItems().map((i) => i.id).join(","), "b,a");
    assert.equal(unregisterMenuItem("a").ok, true);
    assert.equal(listMenuItems().length, 1);
    clearRegistries();
  });
});
