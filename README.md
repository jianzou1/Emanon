# Emanon

Windows 98 复古风格个人网站。基于 [98.css](https://jdan.github.io/98.css/) 还原系统视觉，支持静态托管或 Netlify 全功能部署。

## 特性

- **Win98 UI**：窗口、标题栏、选项卡、按钮、状态栏、树形列表，全套复古还原
- **SPA 导航**：页签切换零网络请求（HTML 缓存 + 细粒度 DOM 替换），非页签页 PJAX 无刷新加载
- **多语言**：中 / 英 / 日三语切换，DOM 自动绑定，偏好持久化
- **Markdown 文章**：Frontmatter 元数据 + marked 解析，自动构建为 Win98 风格文章页
- **CRT 特效**：Canvas 全屏叠加，RGB 扫描线 + 桶形畸变 + 暗角 + 色差
- **留言板**：Netlify Functions + Blobs，支持回复、分页、IP 属地
- **密码保护**：SHA-256 哈希映射，无明文存储
- **游戏推荐**：老虎机动画 + 权重抽奖 + 打字机文本
- **数据预加载**：统一 JSON 缓存层 + 空闲时预热，页签切换秒开
- **移动端适配**：响应式断点 + 触摸区域优化 + hover/active 媒体查询
- **BSOD 404**：蓝屏死机风格自定义 404

## 技术栈

| 模块 | 方案 |
|:---:|:---:|
| 构建 | webpack 5 |
| 模板 | EJS |
| 路由 | TabHandler（SPA）+ PJAX（详情页）|
| UI 框架 | 98.css |
| 后端 | Netlify Functions |
| 存储 | Netlify Blobs |
| 配置 | Excel → JSON（SheetJS）|

## 项目结构

```
Emanon/
├── js/                     # 源码模块
│   ├── index.js            # webpack 入口
│   ├── main.js             # 应用核心（路由调度 / 生命周期）
│   ├── tabHandler.js       # SPA 页签导航（缓存 + DOM 替换）
│   ├── langManager.js      # 多语言管理器
│   ├── dataCache.js        # JSON 统一缓存 / 预热
│   ├── popup.js            # 通用弹窗组件
│   ├── aboutPopup.js       # 关于弹窗
│   ├── dailyPopup.js       # 每日欢迎弹窗
│   ├── cdnLoader.js        # CDN 多源容灾
│   ├── progressBar.js      # 首页进度条
│   ├── previewLoader.js    # 文章列表预览
│   ├── gallery.js          # 画廊
│   ├── gameList.js         # 游戏列表
│   ├── gameRoll.js         # 游戏随机推荐
│   ├── messageBoard.js     # 留言板
│   ├── password.js         # 密码验证
│   ├── crtEffect.js        # CRT 扫描线特效
│   ├── utils.js            # 公共工具函数
│   └── ...                 # tips / logo / footer / scrollToTop 等
├── css/                    # 样式（style.css 为入口）
├── ejs/                    # EJS 页面模板 + 公共片段
├── cfg/                    # 配置（JSON + Excel 源 + 转换脚本）
├── post/                   # 文章（_src/ 下 Markdown 源文件）
├── netlify/functions/      # Serverless 函数（留言板）
├── icon/ favicon/ ui/      # 静态资源
├── main.js + styles.css    # 打包产物（勿手动修改）
├── index.html              # 网站入口
├── 404.html                # BSOD 404
├── netlify.toml            # Netlify 配置
└── webpack.config.js
```

## 快速开始

**环境要求**：Node.js 16+

```bash
npm install          # 安装依赖
npm start            # 本地开发（HMR）
npm run build        # 完整构建（文章 + 配置 + webpack）
```

其他命令：

| 命令 | 说明 |
|---|---|
| `npm run post` | 仅构建 Markdown → HTML |
| `npm run cfg` | 仅 Excel → JSON |
| `npm run pack` | 仅 webpack 生产打包 |

## 文章管理

在 `post/_src/` 下新建 `.md` 文件，支持 Frontmatter：

```markdown
---
title: 文章标题
icon: text-markdown.png
order: 1
hidden: false
---

正文...
```

| 字段 | 默认值 | 说明 |
|:---:|:---:|:---|
| title | 正文首行 | 文章标题 |
| icon | text-markdown.png | 列表图标 |
| order | 999 | 排序权重（小在前）|
| hidden | false | 隐藏（不入列表，可直链访问）|

> 以 `_` 开头的 `.md` 文件会被跳过。

构建后自动生成 `cfg/article_cfg.json`。也可在 GitHub 上直接创建文章：[新建文章](https://github.com/jianzou1/Emanon/new/master/post/_src?filename=new_article.md&value=---%0Atitle%3A%20%E6%96%87%E7%AB%A0%E6%A0%87%E9%A2%98%0Aicon%3A%20text-markdown.png%0Aorder%3A%20999%0Ahidden%3A%20false%0A---%0A%0A%23%20%E6%96%87%E7%AB%A0%E6%A0%87%E9%A2%98%0A%0A%E6%AD%A3%E6%96%87%E5%86%85%E5%AE%B9...)

## 配置表

Excel 文件放在 `cfg/excel/`，运行 `npm run cfg` 转为 JSON。

**格式约定**：第 1 行备注（忽略）、第 2 行数据类型（`int/string/float/bool/int[]`）、第 3 行字段名、第 4 行起数据。

## 多语言

HTML 标签添加 `data-lang-id` 属性即可自动翻译：

```html
<span data-lang-id="your_key">默认文本</span>
<input data-lang-placeholder="placeholder_key" />
```

翻译条目维护在 `cfg/lang_cfg.json`。新增语言需在语言切换器中添加 `<option>`。

## 密码保护

1. 选定密码，计算 SHA-256 前 8 位：
   ```js
   crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourPassword'))
     .then(buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('').slice(0,8))
     .then(console.log);
   ```
2. 将文章放入 `post/<hash>/index.html`
3. 用户在密码页输入即可访问

## 留言板

基于 Netlify Functions + Blobs，本地开发时可用 Mock 模式：

```
?mockMessages=1              # URL 参数
localStorage.setItem('mockMessages', '1')  # 或 localStorage
```

需要真实后端可安装 [Netlify CLI](https://docs.netlify.com/cli/get-started/) 后运行 `netlify dev`。

## 部署

项目已配置 `netlify.toml`，推送到 GitHub 后在 Netlify 连接仓库即可自动部署。

也可部署到任意静态托管（GitHub Pages / Vercel 等），留言板功能需 Netlify 环境。

## License

ISC
