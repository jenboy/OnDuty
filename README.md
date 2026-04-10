# OnDuty - 值日排班系统

一个功能强大、易用的值日排班系统，支持多种排班策略、农历显示和多格式导出。

## ✨ 核心特性

### 📋 人员管理
- 无限人员录入，支持部门、联系方式、颜色标识
- 智能避让：为每个人设置不可排班的星期几
- 支持启用/停用人员状态

### 🔄 动态排班
- 三种轮换策略：正序、倒序、随机
- 智能避免连续值班
- 平均分配值班次数
- 支持跳过周末

### 📅 日历视图
- 月度日历展示，显示农历日期和24节气
- 历史排班表快速切换
- 月度值班统计，包含进度条可视化

### 📤 多格式导出
- Excel 格式（日历排版）
- Word 格式（日历排版）
- 图片格式（PNG）

### 🎨 技术特点
- 现代化响应式三栏设计
- 支持离线使用（本地存储）
- 完整的 TypeScript 类型支持
- 静态部署，可托管到 Cloudflare Pages

## 🚀 快速开始

### 本地开发

1. **克隆项目**
   ```bash
   git clone git@github.com:jenboy/OnDuty.git
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

#### Cloudflare Pages (推荐)

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **部署**
   ```bash
   npm run build
   wrangler pages deploy
   ```

#### 其他托管服务

- **Vercel**：`npx vercel`
- **GitHub Pages**：部署 `build` 目录
- **Netlify**：连接 GitHub 仓库自动部署

## 📖 使用指南

### 1. 人员管理
- 点击「人员管理」面板
- 点击「添加人员」按钮
- 填写人员信息和不可排班日期
- 支持编辑和删除人员

### 2. 排班设置
- 选择开始和结束日期（自动填充为月末日）
- 自动生成排班表名称
- 选择轮换策略和是否跳过周末
- 点击「生成排班表」确认生成

### 3. 日历视图
- 查看月度值班安排
- 显示农历日期和节气
- 点击历史排班表快速切换
- 点击「统计」查看值班情况

### 4. 导出功能
- 点击「导出」按钮
- 选择 Excel、Word 或图片格式
- 直接下载导出文件

## 📁 项目结构

```
OnDuty/
├── src/
│   ├── app/              # Next.js 应用
│   │   ├── page.tsx      # 主页面（三栏布局）
│   │   ├── layout.tsx    # 布局
│   │   └── globals.css   # 全局样式
│   ├── components/       # React 组件
│   │   ├── PersonManager.tsx    # 人员管理
│   │   ├── ScheduleGenerator.tsx # 排班生成
│   │   └── CalendarView.tsx      # 日历视图
│   ├── hooks/            # React Hooks
│   │   └── useStorage.ts # 存储 Hook
│   ├── lib/              # 工具库
│   │   ├── utils.ts      # 工具函数（农历转换、节气计算）
│   │   ├── scheduler.ts  # 排班引擎
│   │   ├── storage.ts    # 数据存储（本地存储）
│   │   └── export.ts     # 导出功能
│   └── types/            # TypeScript 类型
│       └── index.ts
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── wrangler.toml        # Cloudflare 配置
└── README.md
```

## 🛠 技术栈

- **前端框架**：Next.js 14
- **UI 框架**：Tailwind CSS v3
- **语言**：TypeScript
- **状态管理**：React useState
- **存储方案**：localStorage（本地存储）
- **图标库**：Lucide React
- **导出库**：
  - Excel: xlsx
  - Word: 原生 HTML
  - 图片: html2canvas
  - PDF: jspdf

## 🌐 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 📅 农历和节气

- 公历转农历（1900-2100年）
- 24节气计算和显示
- 节气当天自动替换农历日期显示

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🌟 特色亮点

- **智能排班**：避免连续值班，平均分配任务
- **农历支持**：完整的农历和节气显示
- **多格式导出**：满足不同场景需求
- **响应式设计**：适配各种设备屏幕
- **离线使用**：无网络环境也能正常工作

## 🎯 适用场景

- 办公室值日排班
- 学校班级值日
- 医院值班安排
- 社区志愿者排班
- 任何需要轮值的场景