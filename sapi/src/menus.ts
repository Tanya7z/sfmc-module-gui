/**
 * SPA 主菜单 / 管理面板装配
 */

import { Player } from "@minecraft/server";
import {
  FormStatus,
  MenuNavigator,
  Msg,
  Permission,
  debug,
  obsStr,
  type Page,
} from "@sfmc-bds/sdk/sapi/runtime";
import { service } from "@sfmc-bds/sdk/sapi/service";
import { listAdminItems, listMenuItems, type MenuItemDefinition } from "./registry.js";

export interface GuiRuntimeConfig {
  menu_title: string;
  admin_title: string;
  empty_placeholder: string;
  show_live_dashboard: boolean;
}

async function resolveTitle(item: MenuItemDefinition, player: Player): Promise<string> {
  const t = typeof item.title === "function" ? await item.title(player) : item.title;
  let badge = "";
  if (item.badge) {
    try {
      badge = await item.badge(player);
    } catch {
      badge = "";
    }
  }
  return badge ? `${t} ${badge}` : t;
}

async function softCall<T>(name: string, input: Record<string, unknown>): Promise<T | null> {
  try {
    return (await service.call(name, input)) as T;
  } catch {
    return null;
  }
}

async function buildLiveDashboard(page: Page, player: Player): Promise<void> {
  const balance = await softCall<{ balance?: number }>("economy.account.get", {
    playerId: player.id,
  });
  const online = await softCall<{
    todaySeconds?: number;
    totalSeconds?: number;
  }>("onlinetime.byPlayer", { playerId: player.id });
  const tps = await softCall<{ text?: string; tps?: number }>("tps.status", {});

  const parts: string[] = [];
  if (balance && typeof balance.balance === "number") {
    parts.push(`§e余额 §f${balance.balance}`);
  }
  if (online && typeof online.todaySeconds === "number") {
    const m = Math.floor(online.todaySeconds / 60);
    parts.push(`§e今日在线 §f${m}分`);
  }
  if (tps) {
    const v = typeof tps.tps === "number" ? tps.tps.toFixed(1) : tps.text || "";
    if (v) parts.push(`§eTPS §f${v}`);
  }
  if (parts.length) {
    page.label(obsStr(parts.join("  §7|  ")));
    page.divider();
  }
}

function canSee(player: Player, item: MenuItemDefinition): boolean {
  if (!item.permission) return true;
  try {
    return Permission.check(player, item.permission);
  } catch {
    return true;
  }
}

async function mountItems(
  nav: MenuNavigator,
  rootPage: Page,
  player: Player,
  items: MenuItemDefinition[],
  emptyText: string,
): Promise<void> {
  const visible = items.filter((i) => canSee(player, i));
  if (visible.length === 0) {
    rootPage.label(emptyText);
    return;
  }

  for (const item of visible) {
    const label = await resolveTitle(item, player);
    if (item.build) {
      const sectionId = `item_${item.id}`;
      nav.section(sectionId, label, async (page, n) => {
        new FormStatus(page);
        await item.build!(page, n);
      });
      rootPage.button(label, () => {
        nav.go(sectionId);
        void nav.rebuild();
      });
    } else if (item.handler) {
      rootPage.button(label, () => {
        nav.leave(() => item.handler!(player));
      });
    } else {
      rootPage.button(label, () => {
        Msg.tips("该入口尚未配置动作", player);
      });
    }
  }
}

/** 打开主菜单 SPA。 */
export async function openMainMenu(player: Player, cfg: GuiRuntimeConfig): Promise<void> {
  const nav = new MenuNavigator(player);
  nav.section("root", cfg.menu_title, async (page) => {
    if (cfg.show_live_dashboard) {
      await buildLiveDashboard(page, player);
    }
    page.header(cfg.menu_title);
    page.spacer();
    await mountItems(nav, page, player, listMenuItems(), cfg.empty_placeholder);
  });
  await nav.start("root");
}

/** 打开管理控制台。 */
export async function openAdminPanel(player: Player, cfg: GuiRuntimeConfig): Promise<void> {
  if (!Permission.check(player, "gui.admin")) {
    Msg.error("你没有管理员控制台权限。", player);
    return;
  }
  const nav = new MenuNavigator(player);
  nav.section("admin", cfg.admin_title, async (page) => {
    page.header(cfg.admin_title);
    page.spacer();
    await mountItems(nav, page, player, listAdminItems(), cfg.empty_placeholder);
  });
  await nav.start("admin");
  debug.i("GUI", `admin panel for ${player.name}`);
}
