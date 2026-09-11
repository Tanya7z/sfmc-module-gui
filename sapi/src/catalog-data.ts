/** 控件目录用的静态示例数据，不含 Minecraft 依赖，便于单测。 */

export function catalogDemoData(): Record<string, unknown> {
  return {
    imagePack: "vanilla",
    imageSrc: "textures/ui/icon_recipe_nature",
    items: [
      { id: "alpha", name: "甲项" },
      { id: "beta", name: "乙项" },
    ],
  };
}

export function catalogEcho(input: Record<string, unknown>): {
  ok: boolean;
  message: string;
} {
  return { ok: true, message: String(input.text ?? "") };
}
