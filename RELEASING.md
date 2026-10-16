# 发布与版本管理

面向「Gitea 为主仓、GitHub 为推送镜像」的现状。当前状态：`package.json` 版本 `1.0.0`，首个 tag `v1.0.0` 已发布。

## 版本号

- 语义化版本：`vMAJOR.MINOR.PATCH`（tag 形如 `v1.2.0`，带 `v` 前缀）
  - MAJOR：不兼容的改动（例如改了本地数据结构且不提供迁移）
  - MINOR：向下兼容的新功能（例如批量导入人员）
  - PATCH：向下兼容的修复（例如导出图片被裁、Excel 打开空表）
- **唯一真源是 `package.json` 的 `version`**；发布工作流会校验「tag 去掉 `v` 后必须等于它」，不一致直接失败
- 发布一律用**附注 tag**（`git tag -a`）：正文会被抓进 Release 的「要点」，也是 `git describe` 认的 tag

## 一次发布要做的事（清单）

1. 代码推到 `main`，**CI 绿**（lint → 类型检查 → 单测 → 静态构建 → 校验 `dist/index.html`）
2. 更新 `CHANGELOG.md`：新增一段 `## [vX.Y.Z] - YYYY-MM-DD`，写清新增 / 修复 / 破坏性变更
3. 改 `package.json` 的 `version` 并提交
4. 打**附注 tag**（正文写要点）并推送：

   ```bash
   git tag -a v1.1.0 -m "要点: 新增人员批量导入；修复导出图片被裁与 Excel 打开为空"
   git push origin v1.1.0
   ```

5. **剩下交给 `release.yml`**（推送 tag 即自动触发）：校验 → 构建 → 打包 `dist/` → 创建 Gitea Release → 上传产物。发布正文自动包含 **要点**（取 tag 附注）、**变更明细**（上一个 tag 以来的提交）、**产物**（附件名与提交 SHA）
6. 需要的话在「发布」页面补充说明，尤其是**需要用户动手的事项**（例如数据结构变更 → 让用户先「导出备份」）

## 发布工作流（`.gitea/workflows/release.yml`）

| 项 | 说明 |
|---|---|
| 触发 | 推送形如 `v*` 的 tag；也可在 Actions 页面手动触发并填 tag |
| 权限 | `permissions: contents: write`（Gitea 里 `contents` 覆盖 code 与 releases） |
| 做的事 | `npm ci` → lint/typecheck/test → 版本号一致性校验 → `npm run build` → 打包 `onduty-<版本>.zip`（无 zip 时退化为 `.tar.gz`）→ 建 Release 并挂附件 |
| 幂等 | 同 tag 已有 Release 时会先删掉再重建，方便重跑 |
| 预发布 | tag 里带 `-`（如 `v1.1.0-rc.1`）会自动标记为 pre-release |
| 令牌 | 用 Gitea 作业令牌（`GITEA_TOKEN`，退回 `GITHUB_TOKEN`），无需额外仓库密钥 |

## 产物与部署

- 本项目是**纯前端静态站点**：`npm run build` → `dist/`（`next.config.js` 里 `output: 'export'` + `distDir: 'dist'`）
- 部署：Cloudflare Pages（连 GitHub 仓库自动构建，节奏 = 镜像同步节奏）、Vercel（仓库内 `vercel.json` 已配好）、或任意静态服务器；详见 README 的「部署」一节
- Release 说明里写清了「本次发布对应的提交」，便于回溯线上跑的是哪一版

## 与 sales-report 的对照

| | sales-report | OnDuty（本仓库） |
|---|---|---|
| 产物 | Windows 可执行文件 + SHA256 | 静态站点 `dist/`（zip 附件） |
| 发布方式 | 手动跑 `release.sh`，脚本建 Release 并挂附件 | **推 tag 即自动**（`release.yml`） |
| 发布正文 | 脚本按 CHANGELOG + tag 附注生成 | 工作流按 tag 附注 + 提交列表生成 |
| 推送镜像 | 无 | 有（Gitea → GitHub，每 24 小时同步 ref 与 tag，**不含 Release 条目**） |

## 关于 GitHub 侧的 Release

推送镜像只同步 git 对象与 ref（**tag 会过去**，Release 条目不会）。所以：

- 只把 GitHub 当代码镜像 → 不用管；
- 想让 GitHub 上也有 Release → 在 GitHub 对同一 tag 手动建一次，或在 `release.yml` 里加一段调用 GitHub API 的步骤（需要额外提供一个 GitHub token 作为仓库密钥）


## 回滚

- **代码回滚**：`git revert <sha>`（保留历史，推荐）或检出上一个 tag 重新构建部署
- **数据回滚**：数据都存在**用户浏览器的 IndexedDB** 里，发布本身不碰服务端数据。但如果某次发布改了本地数据结构，一定要在 Release 的「注意」里写清，并让用户先做「数据 → 导出备份」——浏览器里的旧数据一旦被新版本迁移，就只能靠备份或 `onduty-data.backup.*` 找回
- **镜像回滚**：GitHub 侧是强制推送的镜像，回滚 Gitea 的 main 会在下一次同步时一并覆盖 GitHub

## CI 何时会跑（与发布相关）

- 推送 `main`：**只在这些路径变更时**才跑 —— `src/**`、`package.json`、`package-lock.json`、`next.config.js`、`postcss.config.mjs`、`tsconfig.json`、`eslint.config.mjs`、`vitest.config.mts`、`.gitea/workflows/**`、`wrangler.toml`、`vercel.json`
- 改 README / LICENSE / 本文件：**不触发**（不参与构建）
- 拉取请求：始终触发；也可在 Actions 页面手动触发
- 连续推送：同一分支上未跑完的旧运行会被自动取消
- **打 tag 不触发 CI，但会触发发布工作流**（`release.yml`）：CI 管「提交能不能用」，Release 管「版本怎么发出去」
