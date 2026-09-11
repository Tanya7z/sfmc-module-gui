/**
 * 声明式 UI 控件目录：覆盖当前运行时已接线的全部 JSON 声明，供进服目视核对。
 */

import type { Player } from "@minecraft/server";
import { Command, debug, Permission } from "@sfmc-bds/sdk/sapi/runtime";
import { provide } from "@sfmc-bds/sdk/sapi/service";
import {
  openDeclarativeScreen,
  registerDeclarativeFeature,
} from "./declarative.js";
import { catalogDemoData, catalogEcho } from "./catalog-data.js";
import featureUi from "./ui/feature.ui.json" with { type: "json" };
import homeUi from "./ui/screens/home.ui.json" with { type: "json" };
import logicUi from "./ui/screens/logic.ui.json" with { type: "json" };
import widgetsUi from "./ui/screens/widgets.ui.json" with { type: "json" };

const MODULE_ID = "gui";

function asObject(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

export function registerCatalogUi(): void {
  const result = registerDeclarativeFeature({
    feature: asObject(featureUi),
    screens: {
      "screens/home.ui.json": asObject(homeUi),
      "screens/widgets.ui.json": asObject(widgetsUi),
      "screens/logic.ui.json": asObject(logicUi),
    },
  });
  if (!result.ok) throw new Error(result.error || "控件目录注册失败");
}

export function registerCatalogCommands(): void {
  Permission.register("gui.catalog", Permission.Any);
  Command.register(
    "catalog",
    "gui.catalog",
    (player: Player | undefined) => {
      if (!player) {
        debug.i("GUI", "catalog 必须由玩家执行");
        return;
      }
      void openDeclarativeScreen("gui", "gui.catalog.home", player, {}).catch(
        (error) => {
          debug.w(
            "GUI",
            `打开控件目录失败: ${error instanceof Error ? error.message : String(error)}`,
          );
        },
      );
    },
    "打开声明式 UI 控件目录",
    MODULE_ID,
  );
}

export function provideCatalogServices(): Array<() => void> {
  return [
    provide("gui.catalog.demo", () => catalogDemoData()),
    provide("gui.catalog.echo", (input) => catalogEcho(input)),
  ];
}
