/**
 * @sfmc-bds/module-gui — 数据驱动 UI 引擎与单页路由中枢
 */

import { Player, system, world } from "@minecraft/server";
import { config } from "@sfmc-bds/sdk/sapi/config";
import { ModuleRegistry } from "@sfmc-bds/sdk/module-loader";
import { Command, debug, Permission } from "@sfmc-bds/sdk/sapi/runtime";
import { service } from "@sfmc-bds/sdk/sapi/service";
import { showConfirm, showFormWithBusyRetry, type ShowableForm } from "./forms.js";
import { openAdminPanel, openMainMenu, type GuiRuntimeConfig } from "./menus.js";
import {
  clearRegistries,
  registerAdminItem,
  registerMenuItem,
  unregisterMenuItem,
  type MenuItemDefinition,
} from "./registry.js";

const MODULE_ID = "gui";

const unprovide: Array<() => void> = [];
const eventCleanups: Array<() => void> = [];

let runtimeCfg: GuiRuntimeConfig = {
  menu_title: "§l§eSFMC 综合服务中心",
  admin_title: "§l§cSFMC 管理员控制台",
  empty_placeholder: "当前暂无可用服务",
  show_live_dashboard: true,
};

let enableShortcut = true;
let shortcutType = "minecraft:clock";
let busyRetryTicks = 10;
let busyMaxRetries = 16;

function findPlayer(playerId: string): Player | undefined {
  return world.getAllPlayers().find((p) => p.id === playerId);
}

function asMenuItem(input: Record<string, unknown>): MenuItemDefinition | null {
  const id = String(input.id ?? "");
  if (!id) return null;
  return input as unknown as MenuItemDefinition;
}

ModuleRegistry.register({
  id: MODULE_ID,
  afterWorldLoad: true,
  lifecycle: {
    registerPermissions() {
      Permission.register("menu.use", Permission.Any);
      Permission.register("gui.admin", Permission.Admin);
    },
    registerCommands() {
      const openMenu = (player: Player | undefined) => {
        if (!player) {
          debug.i("GUI", "menu 需由玩家执行");
          return;
        }
        void openMainMenu(player, runtimeCfg);
      };
      Command.register("menu", "menu.use", openMenu, "打开综合服务菜单", MODULE_ID);
      Command.register("cd", "menu.use", openMenu, "打开综合服务菜单", MODULE_ID);

      const openAdmin = (player: Player | undefined) => {
        if (!player) {
          debug.i("GUI", "admin 需由玩家执行");
          return;
        }
        void openAdminPanel(player, runtimeCfg);
      };
      Command.register("admin", "gui.admin", openAdmin, "打开管理员控制台", MODULE_ID);
      Command.register("sfmcadmin", "gui.admin", openAdmin, "打开管理员控制台", MODULE_ID);
    },
    registerEvents() {
      const itemUseCb = world.afterEvents.itemUse.subscribe((ev) => {
        if (!enableShortcut) return;
        const item = ev.itemStack;
        if (!item || item.typeId !== shortcutType) return;
        // 防放置：时钟本身不可放置；仍取消潜在副作用
        system.run(() => {
          void openMainMenu(ev.source, runtimeCfg);
        });
      });
      eventCleanups.push(() => {
        try {
          world.afterEvents.itemUse.unsubscribe(itemUseCb);
        } catch {
          /* ignore */
        }
      });

      // 防丢：尝试拦截扔出快捷道具（若 API 可用）
      const beforeDrop = (
        world.beforeEvents as unknown as {
          itemUse?: { subscribe: (cb: (e: { source: Player; itemStack?: { typeId: string }; cancel?: boolean }) => void) => unknown };
        }
      ).itemUse;
      if (beforeDrop?.subscribe) {
        const cb = beforeDrop.subscribe((e) => {
          if (!enableShortcut) return;
          if (e.itemStack?.typeId === shortcutType) {
            // 右键已由 afterEvents 打开；此处不强制 cancel
          }
        });
        eventCleanups.push(() => {
          try {
            (
              world.beforeEvents as unknown as {
                itemUse?: { unsubscribe: (cb: unknown) => void };
              }
            ).itemUse?.unsubscribe(cb);
          } catch {
            /* ignore */
          }
        });
      }
    },
    async init() {
      const title = await config.get<string>("menu_title");
      const adminTitle = await config.get<string>("admin_title");
      const empty = await config.get<string>("empty_placeholder");
      const live = await config.get<boolean>("show_live_dashboard");
      const shortcut = await config.get<boolean>("enable_shortcut_item");
      const shortcutItem = await config.get<{ type?: string }>("shortcut_item");
      const retryTicks = await config.get<number>("busy_retry_ticks");
      const maxRetries = await config.get<number>("busy_max_retries");

      if (typeof title === "string" && title) runtimeCfg.menu_title = title;
      if (typeof adminTitle === "string" && adminTitle) runtimeCfg.admin_title = adminTitle;
      if (typeof empty === "string" && empty) runtimeCfg.empty_placeholder = empty;
      if (typeof live === "boolean") runtimeCfg.show_live_dashboard = live;
      if (typeof shortcut === "boolean") enableShortcut = shortcut;
      if (shortcutItem?.type) shortcutType = shortcutItem.type;
      if (typeof retryTicks === "number" && retryTicks > 0) busyRetryTicks = retryTicks;
      if (typeof maxRetries === "number" && maxRetries > 0) busyMaxRetries = maxRetries;

      unprovide.push(
        service.provide("gui.registerMenuItem", (input) => {
          const item = asMenuItem(input);
          if (!item) return { ok: false };
          return registerMenuItem(item);
        }),
      );
      unprovide.push(
        service.provide("gui.unregisterMenuItem", (input) =>
          unregisterMenuItem(String(input.id ?? "")),
        ),
      );
      unprovide.push(
        service.provide("gui.registerAdminItem", (input) => {
          const item = asMenuItem(input);
          if (!item) return { ok: false };
          return registerAdminItem(item);
        }),
      );
      unprovide.push(
        service.provide("gui.openMainMenu", async (input) => {
          const player = findPlayer(String(input.playerId ?? ""));
          if (!player) return { ok: false };
          await openMainMenu(player, runtimeCfg);
          return { ok: true };
        }),
      );
      unprovide.push(
        service.provide("gui.openAdminPanel", async (input) => {
          const player = findPlayer(String(input.playerId ?? ""));
          if (!player) return { ok: false };
          await openAdminPanel(player, runtimeCfg);
          return { ok: true };
        }),
      );
      unprovide.push(
        service.provide("gui.confirm", async (input) => {
          const player = findPlayer(String(input.playerId ?? ""));
          if (!player) return false;
          return showConfirm(
            player,
            String(input.title ?? "确认"),
            String(input.body ?? ""),
            typeof input.confirmText === "string" ? input.confirmText : "确认",
            typeof input.cancelText === "string" ? input.cancelText : "取消",
            { maxRetries: busyMaxRetries, retryTicks: busyRetryTicks },
          );
        }),
      );
      unprovide.push(
        service.provide("gui.showForm", async (input) => {
          const player = findPlayer(String(input.playerId ?? ""));
          const form = input.form as ShowableForm | undefined;
          if (!player || !form || typeof form.show !== "function") return undefined;
          const maxRetries =
            typeof input.maxRetries === "number" ? input.maxRetries : busyMaxRetries;
          return showFormWithBusyRetry(player, form, {
            maxRetries,
            retryTicks: busyRetryTicks,
          });
        }),
      );

      debug.i("GUI", `init shortcut=${enableShortcut} retries=${busyMaxRetries}`);
    },
    cleanup() {
      for (const off of unprovide.splice(0, unprovide.length)) {
        try {
          off();
        } catch {
          /* ignore */
        }
      }
      for (const c of eventCleanups.splice(0, eventCleanups.length)) c();
      clearRegistries();
      debug.i("GUI", "cleanup");
    },
  },
});
