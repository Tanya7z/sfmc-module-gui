/**
 * @sfmc-bds/module-gui — 声明式 UI Runtime。
 *
 * 主菜单属于独立产品模块；本模块只注册、解释和打开页面。
 */

import { Player, world } from "@minecraft/server";
import { ModuleRegistry } from "@sfmc-bds/sdk/module-loader";
import { config } from "@sfmc-bds/sdk/sapi/config";
import {
  debug,
  Permission,
} from "@sfmc-bds/sdk/sapi/runtime";
import { provide } from "@sfmc-bds/sdk/sapi/service";
import {
  provideCatalogServices,
  registerCatalogCommands,
  registerCatalogUi,
} from "./catalog.js";
import {
  clearDeclarativeFeatures,
  listDeclarativeEntries,
  openDeclarativeScreen,
  registerDeclarativeFeature,
  unregisterDeclarativeFeature,
} from "./declarative.js";
import {
  showConfirm,
  showFormWithBusyRetry,
  type ShowableForm,
} from "./forms.js";

const MODULE_ID = "gui";

let busyRetryTicks = 10;
let busyMaxRetries = 16;

function findPlayer(playerId: string): Player | undefined {
  return world.getAllPlayers().find((player) => player.id === playerId);
}

/*
 * feature 注册必须在模块生命周期启动前可用：模块导入顺序不应决定 UI 能否注册。
 * 输入与返回值均为纯 JSON，可安全通过进程内总线或未来的传输层。
 */
const unprovide = [
  ...provideCatalogServices(),
  provide("gui.registerFeature", (input) => registerDeclarativeFeature(input)),
  provide("gui.unregisterFeature", (input) =>
    unregisterDeclarativeFeature(String(input.moduleId ?? "")),
  ),
  provide("gui.listEntries", () => ({ entries: listDeclarativeEntries() })),
  provide("gui.openScreen", async (input) => {
    const player = findPlayer(String(input.playerId ?? ""));
    if (!player) return { ok: false, error: "player_not_found" };
    await openDeclarativeScreen(
      String(input.moduleId ?? ""),
      String(input.screenId ?? ""),
      player,
      typeof input.params === "object" &&
        input.params !== null &&
        !Array.isArray(input.params)
        ? (input.params as Record<string, unknown>)
        : {},
    );
    return { ok: true };
  }),
  provide("gui.confirm", async (input) => {
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
  provide("gui.showForm", async (input) => {
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
];

registerCatalogCommands();

ModuleRegistry.register({
  id: MODULE_ID,
  afterWorldLoad: true,
  lifecycle: {
    registerPermissions() {
      Permission.register("gui.catalog", Permission.Any);
    },
    async init() {
      const retryTicks = await config.get<number>("busy_retry_ticks");
      const maxRetries = await config.get<number>("busy_max_retries");
      if (typeof retryTicks === "number" && retryTicks > 0) {
        busyRetryTicks = retryTicks;
      }
      if (typeof maxRetries === "number" && maxRetries > 0) {
        busyMaxRetries = maxRetries;
      }
      await registerCatalogUi();
      debug.i("GUI", `declarative runtime ready retries=${busyMaxRetries}`);
    },
    cleanup() {
      for (const off of unprovide.splice(0, unprovide.length)) {
        try {
          off();
        } catch {
          /* ignore */
        }
      }
      clearDeclarativeFeatures();
      debug.i("GUI", "cleanup");
    },
  },
});
