# OnDuty - 值日排班系统

一个功能强大、易于使用的值日排班系统，支持人员管理、多种排班策略、日历视图、农历显示和多格式导出。

## 功能特性

### 核心功能
- **人员管理**：支持无限数量人员录入，可设置部门、联系方式、颜色标识和不可排班的星期几
- **动态排班**：支持正序、倒序、随机三种轮换策略，智能避免连续值班
- **智能避让**：支持跳过周末，可为每个人单独设置不可排班的星期几
- **平均分配**：排班时自动确保每个人的值班次数尽可能平均
- **排班表名称**：自动填充为「2026年3月值日表」或「2026年3月第3周值日表」格式
- **日历视图**：月度日历展示，显示农历日期和24节气
- **农历显示**：完整的农历日期转换，当天为节气时自动显示节气名称
- **多格式导出**：支持 Excel、Word、图片格式导出，采用日历排版
- **用户隔离**：密码登录/注册，不同用户数据完全隔离
- **历史记录**：左侧展示所有历史排班表，点击跳转到对应月份
- **值班统计**：月度值班统计，显示每个人的值班次数和进度条

### 技术特点
- **现代化 UI**：基于 Tailwind CSS 的响应式三栏设计
- **云存储支持**：使用 Cloudflare KV 存储数据，支持跨设备同步相同密码的数据
- **本地存储**：数据同时保存在浏览器 localStorage，离线也能使用
- **静态部署**：可部署到 Cloudflare Pages、Vercel 等静态托管服务
- **TypeScript**：完整的类型支持，代码更安全
- **Next.js**：基于 React 的现代前端框架

## 快速开始

### 本地运行

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd OnDuty
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   打开浏览器访问 `http://localhost:3000`

### 部署

#### 1. Cloudflare Pages (推荐，支持云存储)
要启用云存储功能，需要配置 Cloudflare KV：

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **创建 KV 命名空间**
   ```bash
   wrangler kv:namespace create "ONDUTY_KV"
   ```

4. **更新 wrangler.toml**
   将创建 KV 命名空间后获得的 ID 更新到 `wrangler.toml` 文件中：
   ```toml
   [[kv_namespaces]]
   binding = "ONDUTY_KV"
   id = "your-kv-namespace-id"  # 替换为实际的 ID
   preview_id = "your-kv-namespace-preview-id"  # 替换为实际的预览 ID
   ```

5. **创建预览 KV 命名空间（可选）**
   ```bash
   wrangler kv:namespace create "ONDUTY_KV_PREVIEW" --preview
   ```

6. **部署到 Cloudflare Pages**
   ```bash
   cd OnDuty
   npm run build
   wrangler pages deploy
   ```

#### 2. Vercel (仅本地存储)
```bash
cd OnDuty
npx vercel
```
注意：Vercel 部署仅支持本地存储，不支持跨设备数据同步。

#### 3. 其他静态托管 (仅本地存储)
```bash
cd OnDuty
npm run build
# 部署 .next 目录到任意静态托管服务
```
注意：其他静态托管仅支持本地存储，不支持跨设备数据同步。

## 使用指南

### 1. 登录/注册
- 首次访问时，输入密码自动注册
- 后续访问使用相同密码登录
- 不同密码对应不同的数据隔离区
- 用户头像显示密码的首个字符

### 2. 人员管理
- 点击右侧「人员管理」面板
- 点击「添加人员」按钮，弹出模态框
- 填写人员信息：姓名、部门、联系方式、颜色标识
- 可设置「不可排班日期」（勾选星期几）
- 支持启用/停用人员
- 支持编辑和删除人员

### 3. 排班设置
- 点击右侧「排班设置」面板
- 选择开始日期和结束日期（点击选择，禁止直接输入）
- 开始日期选择后自动将结束日期设为该月最后一天
- 自动生成排班表名称（可手动修改）
- 点击「生成排班表」按钮，弹出确认弹窗
- 在确认弹窗中选择：
  - 轮换策略（正序/倒序/随机）
  - 是否跳过周末
- 点击「确认生成」完成排班

### 4. 日历视图
- 中间区域显示月度日历视图
- 显示所有排班表的值班情况，无需切换
- 日历显示：
  - 公历日期
  - 农历日期（当天为节气时显示节气名称）
  - 值班人员姓名
- 顶部导航：
  - 「今天」按钮：跳转到当前日期
  - 左右箭头：切换月份
  - 「统计」按钮：查看月度值班统计
  - 「导出」按钮：导出排班表

### 5. 历史排班表
- 左侧面板显示所有历史排班表
- 点击排班表名称，日历视图自动跳转到对应月份

### 6. 导出功能
- 支持 Excel、Word、图片三种格式
- Excel 和 Word 采用日历排版
- 图片导出为当前日历视图的 PNG
- 点击导出按钮直接导出，无需额外弹窗

## 项目结构

```
OnDuty/
├── src/
│   ├── app/              # Next.js 应用
│   │   ├── page.tsx      # 主页面（三栏布局）
│   │   ├── layout.tsx    # 布局
│   │   └── globals.css   # 全局样式
│   ├── components/       # React 组件
│   │   ├── AuthPage.tsx  # 登录/注册页面
│   │   ├── PersonManager.tsx    # 人员管理
│   │   ├── ScheduleGenerator.tsx # 排班生成
│   │   └── CalendarView.tsx      # 日历视图
│   ├── hooks/            # React Hooks
│   │   └── useStorage.ts # 存储 Hook
│   ├── lib/              # 工具库
│   │   ├── utils.ts      # 工具函数（含农历转换、节气计算）
│   │   ├── scheduler.ts  # 排班引擎
│   │   ├── storage.ts    # 数据存储（支持 Cloudflare KV）
│   │   └── export.ts     # 导出功能
│   └── types/            # TypeScript 类型
│       └── index.ts
├── functions/            # Cloudflare Pages Functions
│   └── api/
│       └── data/
│           └── [userId].ts # KV 数据 API
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── wrangler.toml        # Cloudflare 配置
└── README.md
```

## 技术栈

- **前端框架**：Next.js 14
- **UI 框架**：Tailwind CSS v3
- **语言**：TypeScript
- **状态管理**：React useState
- **云存储**：Cloudflare KV
- **本地存储**：localStorage（备用和离线使用）
- **图标库**：Lucide React
- **导出库**：
  - Excel: xlsx
  - Word: 原生 HTML
  - 图片: html2canvas
  - PDF: jspdf

## 云存储工作原理

项目支持两种存储模式：

### 本地开发模式（localhost/127.0.0.1）
- 仅使用浏览器 localStorage
- 数据不会同步到云端
- 适合本地开发和测试

### 生产部署模式（Cloudflare Pages）
- 同时使用 localStorage 和 Cloudflare KV
- 数据自动同步到云端
- 相同密码的用户可以在不同设备上访问相同数据
- 登录时优先从云端加载数据，本地数据作为备份
- 数据变更后自动保存到云端（1秒防抖）

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 农历和节气

项目集成了完整的农历转换算法，支持：
- 公历转农历（1900-2100年）
- 24节气计算和显示
- 当天为节气时自动替换农历日期显示

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
