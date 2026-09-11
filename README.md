# @sfmc-bds/module-gui

Wave B official SFMC module: **gui**（声明式界面运行时）.

本模块只负责注册、解释和显示 `*.ui.json` 页面，不再提供主菜单、管理员聚合页、`/menu` 命令或快捷道具。未来的综合主菜单应作为独立模块，通过 `gui.listEntries` 获取入口并调用 `gui.openScreen`。

## Develop

```bash
npm install
npm run typecheck
npm test
```

Install into platform:

```bash
sfmc mod install gui --from dir:. --link
```
