# dsh-appearance

DeepSeek Harness Web 外观设置插件：主题预设（Claude / GitHub / 新粗野主义 / 终端）+ 字体设置（界面字体、代码字体、字号），持久化在 Host 设置文档中。

## 功能

- **主题**：浅色 / 深色 / 跟随系统（内建）+ 四个第三方主题预设，通过 `--dsw-alias-*` token 覆盖实现：
  - `claude` — Claude 暖米白 + 赤陶橙强调
  - `github` — GitHub 白底 + 绿强调
  - `brutalism` — 新粗野主义（奶油底 + 纯黑高对比 + 橙色撞色）
  - `terminal` — 深黑绿磷光终端风
- **界面字体**：默认 / 无衬线 / 衬线 / 等宽 / 自定义（覆盖 `--dsw-font-family`）
- **代码字体**：默认 / JetBrains Mono / Fira Code / Consolas / 自定义（覆盖 `--ds-font-family-code`）
- **字号**：小 13px / 标准 14px / 大 16px

所有选择写入 `$DSH_HOME/settings.yaml` 的 `ui-appearance:` 段，刷新后自动恢复。

## 结构（TypeScript 源码 + 构建产物）

```
dsh-appearance/
├── src/
│   ├── index.ts          # Host 侧源码：注册 ui-appearance settings namespace
│   └── client/index.ts   # 浏览器侧源码：主题注册、设置页、字体应用
├── lib/                  # 构建产物（node build.mjs 生成，勿手改）
│   ├── index.js          # Host 侧（ESM）
│   └── client.js         # 浏览器侧（module-loader bundle 格式）
├── cordis.patch.yml      # --patch overlay（docs"第一个插件"式本地开发加载）
├── build.mjs             # 构建脚本（tsc 转译 + client 包裹 loader 格式）
├── tsconfig.json         # 类型检查配置（npm run typecheck）
└── package.json
```

开发命令：`npm run typecheck`（类型检查）、`npm run build`（构建）、`npm run watch`（监听 src 变化自动构建）。

## 安装（web profile）

```sh
# 1. 安装包到 web profile（转发 pnpm）
dsh plugin --profile web add <本目录绝对路径>

# 2. 在 $DSH_HOME/profiles/web/cordis.patch.yml 启用
#    - insert:
#        - id: ui-appearance
#          name: 'dsh-appearance'
#    或使用项目内的 cordis.patch.yml 通过 --patch 加载：
#    dsh web --patch ./cordis.patch.yml

# 3. 放开网关设置白名单（必须）：
#    编辑 $DSH_HOME/profiles/node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js，
#    在 WEB_SETTINGS_NAMESPACES 数组中添加 "ui-appearance"。
#    否则浏览器对 ui-appearance 的读写会被网关以 settings-not-exposed 拒绝
#    （选中态与持久化都不会生效）。注意：升级/重装 @deepseek-ai/dsh-host-apiproxy
#    后此补丁会被覆盖，需重新添加。

# 4. 重启 dsh web 使配置生效
```

## 说明

- 第三方主题 id 不写入内建 `ui-theme.preference`（该字段只接受 light/dark/system），本插件用自己的 `ui-appearance.theme` 字段持久化，加载时重新 `setTheme`。
- 主题注册有重复 id 保护；移除本插件不会覆盖最后持久化的内建偏好。
- 浏览器侧 bundle 采用与官方 `@deepseek-ai/dsh-client-*` 相同的 `window.__ModuleLoader__.load({id, factory})` 产物格式；`react` 与 `@deepseek-ai/dsh-*` 服务在浏览器模块表中按需解析，无需内联。
