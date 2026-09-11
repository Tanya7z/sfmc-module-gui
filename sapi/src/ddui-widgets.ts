/**
 * 把声明式 JSON 字段映射成 CustomForm 能吃的参数。
 *
 * 按钮不能用 § 色码（DDUI 会剥掉），tone 改成剥离后仍可见的前缀标记。
 */

export type CustomFormImageArgs = {
  src: string;
  pack: string;
};

export type CustomFormButtonImageDetails = {
  imageSrc: string;
  imagePackId: string;
};

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/** 图像必须同时有 source 与 pack，否则不渲染（空 pack 在 CustomForm 上等于废图）。 */
export function customFormImageArgs(node: {
  source?: unknown;
  pack?: unknown;
}): CustomFormImageArgs | undefined {
  const src = text(node.source).trim();
  const pack = text(node.pack).trim();
  if (!src || !pack) return undefined;
  return { src, pack };
}

/** 按钮图标对应 ButtonOptions.imageDetails；缺 pack 则不加图标。 */
export function customFormButtonImageDetails(node: {
  icon?: unknown;
  iconPack?: unknown;
}): CustomFormButtonImageDetails | undefined {
  const imageSrc = text(node.icon).trim();
  const imagePackId = text(node.iconPack).trim();
  if (!imageSrc || !imagePackId) return undefined;
  return { imageSrc, imagePackId };
}

function buttonToneMarker(tone: unknown): string {
  switch (tone) {
    case "success":
      return "✔ ";
    case "warning":
      return "！ ";
    case "danger":
      return "✘ ";
    default:
      return "";
  }
}

/** 按钮文案：tone 用可见标记，避免写入会被剥掉的 § 色码。 */
export function customFormButtonLabel(label: string, tone?: unknown): string {
  return buttonToneMarker(tone) + label;
}
