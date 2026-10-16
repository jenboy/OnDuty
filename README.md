# OnDuty - 值日排班系统

一个纯前端的值日排班工具：录入人员 → 生成排班 → 看日历（含农历与二十四节气）→ 导出 Excel / Word / 图片。
**没有后端**：所有数据都保存在使用者自己的浏览器里。

> **仓库来源**：本仓库迁自 GitHub [`jenboy/OnDuty`](https://github.com/jenboy/OnDuty)，日常在自建 Gitea 上开发，并向 GitHub 做**推送镜像**（默认每 24 小时同步一次 ref；Release 条目不会同步）。
> **版本控制约定**：构建产物（`.next/`、`dist/`、`out/`）与依赖目录不入库。
> **发布与版本管理**：见 [RELEASING.md](./RELEASING.md)。

## 功能

**人员管理**
- 单个添加，或**批量导入**：粘贴名单（每行一人，支持 `姓名,部门,电话,邮箱`，也能直接粘 Excel 多列），导入前逐行预览，可跳过重名
- 部门 / 电话 / 邮箱 / 标识颜色；为每个人设置**不可排班的星期**
- 启用停用、拖拽或箭头调整顺序（顺序即正序轮换顺序）
- **归档而非删除**：归档的人不再参与新排班，但历史排班表里名字与颜色照常显示

**排班**
- 轮换策略：正序 / 倒序 / 随机起点（随机带种子，同一张表重算结果一致）
- 粒度：每天一人，或每 7 天一人；可选跳过周末
- 自动平均分配值班次数、避免连续值班；可勾选「接上一张表」避免跨表连值
- 生成前有前 7 天预览与风险提示（如某天没人可排、区间内全是周末）

**日历与统计**
- 月历显示**农历日期与二十四节气**（节气数据按官方历表校验：2026 年 24/24 全对）
- 本月值班统计、全周期统计；无人可排的日期单独标出

**导出**（都是本地生成，不上传任何数据）
- **Excel**：按月份分工作表，表头底色 / 加粗 / 边框 / 行高真实生效
- **Word**：日历排版，可直接打印
- **图片**：当前显示月份的 PNG
- 三种导出的代码都在点击时才加载，不进首屏

**数据与备份**
- 保存在浏览器 IndexedDB（每个来源独立，换设备/换浏览器互不影响）
- 支持 JSON 备份导出与导入（导入会覆盖当前数据，有二次确认）
- 首次打开会自动迁移旧版本留在 localStorage 的数据，并把原键改名备份为 `onduty-data.backup.<时间戳>`

## 技术栈

| 用途 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router，`output: 'export'` 静态导出） |
| UI | React 19 + Tailwind CSS 4 + Headless UI（弹窗无障碍） |
| 状态与持久化 | Zustand 5 + idb-keyval（IndexedDB） |
| 农历与节气 | lunar-typescript |
| 导出 | write-excel-file（Excel）、原生 HTML（Word）、html-to-image（PNG） |
| 测试 | Vitest 5（node 环境，纯逻辑单测） |

## 本地开发

需要 **Node.js ≥ 20.9**（仓库里有 `.node-version` / `.nvmrc`，当前 CI 与部署环境用 22）。

```bash
npm ci
npm run dev          # http://localhost:3000
```

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 静态导出到 `dist/` |
| `npm run lint` | ESLint（0 error 门禁） |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | 单元测试（日期、节气、排班引擎、迁移、导入解析、Excel 文件结构） |

## 部署

产物是纯静态站点：`npm run build` → `dist/`。三种方式任选，产物完全一样。

### 1. Cloudflare Pages（当前使用）

Cloudflare Pages 连的是 **GitHub** 仓库，而 GitHub 是 Gitea 的推送镜像 —— 所以**部署节奏 = 镜像同步节奏**（默认 24 小时一次）。Pages 项目里需要设置：

| 设置项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node 版本 | 由仓库根目录的 `.node-version` 决定（22） |

> ⚠️ 输出目录填错（比如填 `out`、`build`、`.next`）会出现"构建成功但站点是空的"。

直接上传（不经 Git 集成）也可以：

```bash
npm run build
npx wrangler pages deploy dist
```

### 2. Vercel

仓库里的 `vercel.json` 已按静态导出配好（`buildCommand` / `outputDirectory: dist` / `trailingSlash`），把 GitHub 仓库导入 Vercel 即可，无需再改面板设置。

### 3. Cloudflare Workers 静态资源（可选）

`wrangler.toml` 里 `[assets] directory = "./dist"`，执行 `npx wrangler deploy` 即可发布。

### 其他

把 `dist/` 整个目录交给任意静态服务器（Nginx / 对象存储 / 内网服务器）都行，注意保留 `trailingSlash` 的目录式路由（`/people/` → `dist/people/index.html`）。

## 项目结构

```
src/
├── app/                    # 路由（均为静态预渲染）
│   ├── page.tsx            # 首页：今天谁值班 + 本月日历 + 本月统计
│   ├── schedules/          # 排班表列表：生成向导、设为当前、重命名、删除
│   ├── schedule/           # 单表详情（?id=）：按月翻看、统计、导出
│   └── people/             # 人员管理：增删改、归档、排序、批量导入
├── domain/                 # 纯逻辑（零 React、零 IO，全部有单测）
│   ├── types.ts            # 领域模型
│   ├── date.ts             # 统一「YYYY-MM-DD 本地日历日」
│   ├── lunar.ts            # 农历与二十四节气（按年月缓存）
│   ├── scheduler.ts        # 排班引擎（可复现、可跨表接续）
│   ├── stats.ts            # 统计与分月
│   ├── personImport.ts     # 批量导入文本解析
│   └── rng.ts              # 可复现随机数
├── store/                  # Zustand + IndexedDB + 旧数据迁移 + JSON 备份
├── export/                 # Excel / Word / 图片三种导出
└── components/             # ui/ 基元、calendar/ 日历、people/、schedules/、export/
```

## 测试与 CI

- **57 个单元测试**覆盖：日期换算与时区、二十四节气（对官方 2026 年表 24/24）、排班引擎（公平性、避让、跨表接续、随机可复现）、旧数据迁移与 JSON 备份校验、批量导入解析、以及**真实写出的 xlsx 结构**（`cellXfs`、样式索引、颜色合法性）
- CI 见 `.gitea/workflows/ci.yml`：**只在 `src/**`、依赖清单、工具链配置、工作流自身、部署配置变更时触发**（改文档不跑）；连续推送会取消同分支未跑完的旧运行
- 流水线：`npm ci` → lint → typecheck → test → build → 校验 `dist/index.html`

## 许可证

MIT，见 [LICENSE](./LICENSE)。
