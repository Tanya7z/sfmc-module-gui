import assert from "node:assert/strict";
import test from "node:test";
import {
  customFormButtonImageDetails,
  customFormButtonLabel,
  customFormButtonTooltip,
  customFormDropdownItems,
  customFormFieldOptions,
  customFormImageArgs,
  customFormImageOptions,
} from "../sapi/src/ddui-widgets.ts";

test("图像必须同时给出 source 与 pack 才映射到 CustomForm.image", () => {
  assert.equal(customFormImageArgs({ source: "textures/ui/icon.png" }), undefined);
  assert.equal(customFormImageArgs({ source: "textures/ui/icon.png", pack: "" }), undefined);
  assert.deepEqual(
    customFormImageArgs({ source: "textures/ui/icon.png", pack: "vanilla" }),
    { src: "textures/ui/icon.png", pack: "vanilla" },
  );
});

test("按钮 icon 必须同时给出 iconPack 才生成 imageDetails", () => {
  assert.equal(
    customFormButtonImageDetails({ icon: "textures/ui/icon.png" }),
    undefined,
  );
  assert.deepEqual(
    customFormButtonImageDetails({
      icon: "textures/ui/icon.png",
      iconPack: "vanilla",
    }),
    { imageSrc: "textures/ui/icon.png", imagePackId: "vanilla" },
  );
});

test("按钮 tone 使用剥离格式码后仍可见的标记，而不是 § 色码", () => {
  assert.equal(customFormButtonLabel("删除", "danger"), "✘ 删除");
  assert.equal(customFormButtonLabel("注意", "warning"), "！ 注意");
  assert.equal(customFormButtonLabel("保存", "success"), "✔ 保存");
  assert.equal(customFormButtonLabel("打开", "muted"), "打开");
  assert.equal(customFormButtonLabel("打开"), "打开");
  assert.equal(/§/.test(customFormButtonLabel("删除", "danger")), false);
});

test("按钮 tooltip 优先于 description，缺省时回退 description", () => {
  assert.equal(
    customFormButtonTooltip({ tooltip: "悬停", description: "说明" }),
    "悬停",
  );
  assert.equal(customFormButtonTooltip({ description: "说明" }), "说明");
  assert.equal(customFormButtonTooltip({}), undefined);
});

test("输入控件 description 与 tooltip 分列，并可带禁用", () => {
  assert.deepEqual(
    customFormFieldOptions({
      description: "下方说明",
      tooltip: "悬停",
      disabled: true,
    }),
    { description: "下方说明", tooltip: "悬停", disabled: true },
  );
  assert.deepEqual(customFormFieldOptions({ description: "下方说明" }), {
    description: "下方说明",
  });
  assert.deepEqual(
    customFormFieldOptions({
      description: "滑块",
      fixedFormatDigits: 0,
    }),
    { description: "滑块", fixedFormatDigits: 0 },
  );
});

test("输入控件 disabled 是 Observable 时原样下传，不能拍成静态 true", () => {
  const live = { getData: () => false };
  const options = customFormFieldOptions({ disabled: live });
  assert.equal(options.disabled, live);
});

test("图像 options 只写出 width 与 tooltip", () => {
  assert.deepEqual(customFormImageOptions({ width: 48, tooltip: "图标" }), {
    width: 48,
    tooltip: "图标",
  });
  assert.deepEqual(customFormImageOptions({ width: -1 }), {});
});

test("下拉项带上 description，value 仍是稳定下标", () => {
  assert.deepEqual(
    customFormDropdownItems([
      { label: "甲", value: "a", description: "第一项" },
      { label: "乙", value: "b" },
    ]),
    [
      { label: "甲", value: 0, description: "第一项" },
      { label: "乙", value: 1 },
    ],
  );
});

