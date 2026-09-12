import assert from "node:assert/strict";
import test from "node:test";
import { resolveDisabledControl } from "../sapi/src/disabled-when.ts";

type MockBool = {
  getData(): boolean;
  setData(value: boolean): void;
  subscribe(callback: (value: boolean) => void): (value: boolean) => void;
};

function mockBool(initial: boolean): MockBool {
  let value = initial;
  const listeners = new Set<(value: boolean) => void>();
  return {
    getData: () => value,
    setData: (next) => {
      if (next === value) return;
      value = next;
      for (const listener of listeners) listener(next);
    },
    subscribe: (callback) => {
      listeners.add(callback);
      return callback;
    },
  };
}

test("disabledWhen 直接引用 state 布尔时复用同一 Observable", () => {
  const locked = mockBool(false);
  const control = resolveDisabledControl(
    { ref: "state.locked" },
    {
      derivedDefs: {},
      getStateBoolean: (name) => (name === "locked" ? locked : undefined),
      subscribeState: () => undefined,
      evaluate: () => locked.getData(),
      createDerived: (initial) => mockBool(initial),
    },
  );
  assert.equal(control, locked);
});

test("disabledWhen 依赖 derived 时，源 state 变化会更新禁用态", () => {
  const locked = mockBool(false);
  let canEdit = !locked.getData();
  const control = resolveDisabledControl(
    { op: "not", args: [{ ref: "derived.canEdit" }] },
    {
      derivedDefs: {
        canEdit: { op: "not", args: [{ ref: "state.locked" }] },
      },
      getStateBoolean: (name) => (name === "locked" ? locked : undefined),
      subscribeState: (name, callback) => {
        if (name === "locked") locked.subscribe(callback);
      },
      evaluate: () => {
        canEdit = !locked.getData();
        return !canEdit;
      },
      createDerived: (initial) => mockBool(initial),
    },
  );
  assert.ok(control);
  assert.notEqual(control, locked);
  assert.equal(control.getData(), false);
  locked.setData(true);
  assert.equal(control.getData(), true);
});
