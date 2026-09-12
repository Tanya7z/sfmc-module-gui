# @sfmc-bds/module-gui（已退役）

独立 `gui` 模块已移除，不再安装、构建或发布。

声明式 JSON UI 运行时已经收编到平台 SDK：

- 业务模块通过 `@sfmc-bds/sdk/sapi/ui` 注册并打开页面；
- 原 `gui.registerFeature`、`gui.unregisterFeature`、`gui.openScreen` 服务已取消；
- `/c:catalog` 控件验收目录已迁移到 `@sfmc-bds/module-qa`。

本仓库仅保留为历史入口，运行时代码以平台 SDK 为准。
