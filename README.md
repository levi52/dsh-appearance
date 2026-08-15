<div align="center">

# 🎨 DeepSeek Harness 外观插件

**DeepSeek Harness Web 的外观设置插件：主题、强调色、字体、背景壁纸，一键个性化你的 Web UI。**

[English](README.en.md) · 中文

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
[![CI](https://img.shields.io/github/actions/workflow/status/levi52/dsh-appearance/ci.yml?label=CI)](https://github.com/levi52/dsh-appearance/actions)
[![Developed with DeepSeek Harness](https://img.shields.io/badge/Built%20with-DeepSeek%20Harness-4d6bfe.svg)](https://www.deepseek.com/harness/)

</div>

---

## 特性

- 🎨 **主题**：浅色 / 深色 / 跟随系统 + 9 个预设主题（Claude、GitHub、新粗野主义、终端、Dracula、Tokyo Night、Gruvbox、Solarized、Material），支持**自定义主题**（编辑器调整 5 个关键色，其余自动推导）
- 🌈 **强调色**：8 个预设色 + 自定义取色器，叠加在任意主题上，自动按 WCAG 计算反色文字
- 🔤 **字体**：界面字体 / 代码字体（默认、无衬线、衬线、等宽、自定义），支持**系统字体选择器**（直接挑选电脑已装字体），字号三档缩放
- 🖼️ **背景壁纸**：本地上传或粘贴 URL；**历史壁纸画廊**一键切换、可删除；透明度（最高纯壁纸无遮罩）与模糊度可调
- 📤 **导出 / 导入**：整套外观配置导出为 JSON，便于备份、分享与换机迁移
- ⚡ **快捷切换**：侧边栏底部「外观」按钮即时切换主题与强调色，无需打开设置页
- 💾 **自动持久化**：所有设置保存到 `$DSH_HOME/settings.yaml`，刷新后自动恢复
- 🧩 **草稿工作流**：修改先入草稿，点「保存并应用」才生效，可随时放弃更改

## 安装

### 环境要求

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh` CLI）已安装并运行过 Web profile
- Node.js ≥ 18（开发环境为 v22）

### 安装步骤

```bash
# 1. 一键安装（自动注册 bundle 到 web profile + 开放设置命名空间白名单）：
npm run install-plugin
#    等效于手动执行下面两步，也可用 --profile <name> 指定其他 profile：
#    dsh plugin --profile web add <本目录路径>
#    npm run fix-whitelist
#    （提示：本地 link: 安装不会触发生命周期脚本，白名单需执行一次；
#      registry/npm 安装时 postinstall 会自动尝试。升级/重装
#      dsh-host-apiproxy 后需重新运行 fix-whitelist。）

# 2. 重启 dsh web
```

### 卸载

```bash
npm run uninstall-plugin
#    移除 bundle 并清理网关白名单；用户数据（settings.yaml 的 ui-appearance
#    段与 wallpapers/ 目录）会保留，如需彻底清除请手动删除。
```

> 纯客户端改动（主题色、字体、壁纸设置等）只需**强制刷新浏览器**；宿主侧改动（schema、路由）需要重启。

## 界面说明

| 区域 | 说明 |
|---|---|
| **主题** | 三态 + 9 预设 + 自定义卡片；自定义卡片点击展开/折叠编辑器，实时调色 |
| **强调色** | 预设色板圆点 + 自定义取色器，「主题默认」不叠加 |
| **字体** | 界面字体、代码字体、字号三档（界面缩放） |
| **背景图片** | 上传 / URL / 历史壁纸画廊切换与删除、透明度、模糊度 |
| **操作** | 保存并应用、放弃更改、恢复默认、导出、导入 |

## 数据存储

- **设置**：`$DSH_HOME/settings.yaml` 的 `ui-appearance:` 段（小字段，如主题、字体、透明度）
- **壁纸图片**：`$DSH_HOME/wallpapers/` 目录（上传的图片存为文件，设置只保存服务 URL，不会把大图写进 settings）

## 开发

```bash
npm run typecheck   # 类型检查
npm run build       # 构建 lib/ 产物
npm run watch       # 监听 src/ 变更自动构建
```

源码位于 `src/`（宿主侧 `index.ts`、浏览器侧 `client/index.ts`），构建产物输出到 `lib/`。

## 工作原理

- 主题通过 `--dsw-alias-*` 颜色 token 覆盖实现；预设主题由「紧凑调色板」自动展开为完整 token 集
- 壁纸通过宿主路由存储（`/dsh-appearance/*`），浏览器侧用半透明表面层让壁纸透出，色调跟随当前主题
- 第三方/自定义主题 id 存入 `ui-appearance.theme`（内建 `ui-theme.preference` 只接受 light/dark/system）
- **为什么需要白名单**：打个比方——DSH 的网关像一个**小区门卫**，手里有一份「允许进出的住户名单」。名单是 DSH 出厂时就写死的，只有名单上列出的设置项，浏览器才允许读写。我们的插件相当于新搬来的住户，名字不在名单上，所以浏览器想读写它的设置时会被门卫拦下来（报 `settings-not-exposed`），表现为：设置页里怎么点都不生效、刷新后恢复不了。`fix-whitelist` 脚本就是帮我们把名字**加进门卫的名单**。但每次升级/重装 DSH 的网关组件，门卫会换一份新的出厂名单，我们的名字又没了，所以要再跑一次脚本。

## 安全说明

- 所有数据仅存储在本机（`$DSH_HOME`），不上传任何内容
- 壁纸上传接口只接受图片格式，文件名白名单校验防路径穿越
- 不采集任何密钥或凭据

## 🤖 AI 声明

本项目使用 [DeepSeek Harness](https://www.deepseek.com/harness/) 开发。

## 许可证

[MIT](LICENSE) © Levi5
