# OnDuty - 值日排班系统

一个功能强大、易于使用的值日排班系统，支持无限人员录入、多种排班策略、日历视图和多格式导出。

## 功能特性

### 核心功能
- **人员管理**：支持无限数量人员录入，可设置部门、联系方式和颜色标识
- **动态排班**：7×24 小时连续循环排班，支持正序、倒序、随机三种轮换策略
- **智能避让**：支持跳过周末，可为每个人设置不可排班的星期几
- **排班表名称**：自动填充为「2026年3月值日表」或「2026年3月第3周值日表」格式
- **日历视图**：月度日历展示，带值班统计功能
- **多格式导出**：支持 Excel、Word、图片、JSON 格式导出，采用日历排版
- **用户隔离**：密码登录/注册，不同用户数据完全隔离

### 技术特点
- **现代化 UI**：基于 Tailwind CSS 的响应式设计
- **本地存储**：数据保存在浏览器 localStorage，无需后端服务器
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

#### 1. Vercel (推荐)
```bash
cd OnDuty
npx vercel
```

#### 2. Cloudflare Pages
```bash
cd OnDuty
npm run build
npx wrangler pages deploy dist
```

#### 3. 其他静态托管
```bash
cd OnDuty
npm run build
# 部署 dist 目录到任意静态托管服务
```

## 使用指南

### 1. 登录/注册
- 首次访问时，输入密码自动注册
- 后续访问使用相同密码登录
- 不同密码对应不同的数据隔离区

### 2. 人员管理
- 点击「人员管理」标签
- 点击「添加人员」按钮
- 填写人员信息：姓名、部门、联系方式、颜色标识
- 可设置「不可排班日期」（勾选星期几）
- 支持拖拽排序

### 3. 排班设置
- 点击「排班设置」标签
- 选择开始日期和结束日期
- 选择轮换策略（正序/倒序/随机）
- 选择是否跳过周末
- 自动生成排班表名称（可手动修改）
- 点击「生成排班表」按钮

### 4. 日历视图
- 点击「日历视图」标签
- 查看月度值班安排
- 点击「统计」按钮查看月度值班统计
- 点击「导出」按钮导出排班表

### 5. 导出功能
- 支持 Excel、Word、图片、JSON 格式
- Excel 和 Word 采用日历排版
- 图片导出为当前日历视图的 PNG

## 项目结构

```
OnDuty/
├── src/
│   ├── app/              # Next.js 应用
│   │   ├── page.tsx      # 主页面
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
│   │   ├── utils.ts      # 工具函数
│   │   ├── scheduler.ts  # 排班引擎
│   │   ├── storage.ts    # 数据存储
│   │   └── export.ts     # 导出功能
│   └── types/            # TypeScript 类型
│       └── index.ts
├── dist/                 # 构建输出
├── package.json
├── next.config.js
├── tailwind.config.ts
├── vercel.json           # Vercel 配置
├── wrangler.toml         # Cloudflare 配置
└── README.md
```

## 技术栈

- **前端框架**：Next.js 14
- **UI 框架**：Tailwind CSS v3
- **语言**：TypeScript
- **状态管理**：React useState + localStorage
- **导出库**：
  - Excel: xlsx
  - Word: 原生 HTML
  - 图片: html2canvas
  - PDF: jspdf

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
