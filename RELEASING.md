# 发布与版本管理

面向「Gitea 为主仓、GitHub 为推送镜像」的现状。当前状态：`package.json` 版本 `1.0.0`，**尚未打过任何 tag，也没有 Release**（Gitea 与 GitHub 两侧都是空的）。

## 版本号

- 语义化版本：`vMAJOR.MINOR.PATCH`（tag 形如 `v1.2.0`，带 `v` 前缀）
  - MAJOR：不兼容的改动（例如改了本地数据结构且不提供迁移）
  - MINOR：向下兼容的新功能（例如批量导入人员）
  - PATCH：向下兼容的修复（例如导出图片被裁、Excel 打开空表）
- **唯一真源是 `package.json` 的 `version`**，git tag 必须与它一致；不一致时以 package.json 为准并改 tag（Gitea 不会替你校验这一点）。

## 一次发布要做的事（清单）

1. 代码推到 `main`，**CI 绿**（lint → 类型检查 → 57 个单测 → 静态构建 → 校验 `dist/index.html`）
2. 更新 `CHANGELOG.md`：新增一段 `## [vX.Y.Z] - YYYY-MM-DD`，写清新增 / 修复 / 破坏性变更
3. 改 `package.json` 的 `version` 并提交
4. 打**附注 tag**（`-a`，正文写要点，便于以后生成 Release 说明）并推送：

   ```bash
   git tag -a v1.1.0 -m "要点: 新增人员批量导入；修复导出图片被裁与 Excel 打开为空"
   git push origin v1.1.0
   ```
5. 在 **Gitea 的「发布」页面**（仓库 → 发布 → 新建发布）选择该 tag，正文建议包含：
   - **要点**：这次用户能感知的变化（1~3 条）
   - **注意**：需要用户动手的地方（例如数据结构变更、需要重新导出备份）
   - **变更明细**：按 新增 / 修复 / 内部 分组
   - **产物**：静态站点的部署方式与对应提交
6. **GitHub 侧不会自动出现 Release**：推送镜像只同步 git 对象与 ref（**tag 会同步过去**），Release 条目是平台侧对象、不会被镜像。两种做法：
   - 只把 GitHub 当代码镜像 → 不用管；
   - 想让 GitHub 也有 Release → 在 GitHub 上对同一个 tag 手动建一次（或后续加 tag 触发的工作流，见文末）。

## 产物与部署

- 本项目是**纯前端静态站点**：`npm run build` → `dist/`（`next.config.js` 里 `output: 'export'` + `distDir: 'dist'`）
- 部署目标待定：Cloudflare Pages / Vercel / 自托管 Nginx（三选一后写进 README）
- Release 说明里建议写清「本次发布对应的提交」，方便回溯线上跑的是哪一版

## 与 sales-report 的差别

| | sales-report | OnDuty（本仓库） |
|---|---|---|
| 产物 | Windows 可执行文件 + SHA256 | 静态站点 `dist/` |
| 发布自动化 | `release.sh` + tag 附注 + CHANGELOG **自动生成** Release 正文与附件 | **无**，手动在「发布」页面写 |
| 推送镜像 | 无 | 有（Gitea → GitHub，每 24 小时同步一次 ref，不含 Release） |

如果以后想对齐 sales-report 的体验，可以加一个 **tag 触发的工作流**：构建 `dist/`、打成 zip、通过 Gitea API 附到对应 Release 上（需要 `RELEASE_TOKEN` 之类的仓库密钥）。目前没做。

## CI 何时会跑（与发布相关）

- 推送 `main`：**只在这些路径变更时**才跑 —— `src/**`、`package.json`、`package-lock.json`、`next.config.js`、`postcss.config.mjs`、`tsconfig.json`、`eslint.config.mjs`、`vitest.config.mts`、`.gitea/workflows/**`、`wrangler.toml`、`vercel.json`
- 改 README / LICENSE / 本文件：**不触发**（不参与构建）
- 拉取请求：始终触发；也可在 Actions 页面手动触发
- 连续推送：同一分支上未跑完的旧运行会被自动取消
- **打 tag 不会触发 CI**（tag 不是分支）。要「打 tag 即构建发布产物」需要另加工作流
