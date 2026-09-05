/**
 * 菜单项注册表与类型
 */

import type { Player } from "@minecraft/server";
import type { MenuNavigator, Page } from "@sfmc-bds/sdk/sapi/runtime";

export interface MenuItemDefinition {
  readonly id: string;
  readonly title: string | ((player: Player) => string | Promise<string>);
  readonly order?: number;
  readonly icon?: string;
  readonly category?: string;
  readonly permission?: string;
  readonly badge?: (player: Player) => string | Promise<string>;
  readonly build?: (page: Page, nav: MenuNavigator) => void | Promise<void>;
  readonly handler?: (player: Player) => void;
}

const menuItems = new Map<string, MenuItemDefinition>();
const adminItems = new Map<string, MenuItemDefinition>();

export function registerMenuItem(item: MenuItemDefinition): { ok: boolean } {
  if (!item?.id) return { ok: false };
  menuItems.set(item.id, item);
  return { ok: true };
}

export function unregisterMenuItem(id: string): { ok: boolean } {
  return { ok: menuItems.delete(id) };
}

export function registerAdminItem(item: MenuItemDefinition): { ok: boolean } {
  if (!item?.id) return { ok: false };
  adminItems.set(item.id, item);
  return { ok: true };
}

export function listMenuItems(): MenuItemDefinition[] {
  return [...menuItems.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function listAdminItems(): MenuItemDefinition[] {
  return [...adminItems.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function clearRegistries(): void {
  menuItems.clear();
  adminItems.clear();
}
