# Emanon

一个基于 Windows 98 复古风格的个人网站，使用 98.css 还原 Windows 98 系统视觉，支持静态托管部署，可选配 Netlify Functions 实现留言板等动态功能。

## 核心特性

- **复古 UI**：基于 98.css 还原 Windows 98 窗口、标题栏、选项卡、按钮、状态栏等系统视觉
- **无刷新导航**：集成 PJAX 0.2.8，仅替换 `#main` 内容与 `<title>`，无需整页刷新
- **Markdown 文章**：内置 marked 解析器，Markdown 自动构建为 Windows 风格文章页
- **多语言系统**：v3.1 管理器，支持中/英/日切换，DOM 自动绑定，用户偏好持久化
- **配置驱动**：Excel 表格驱动内容管理，自动转换为 JSON 配置
- **CRT 特效**：全屏 Canvas 叠加层，RGB 扫描线 + 桶形畸变 + 边缘暗角 + 闪烁效果
- **CDN 容灾**：多源并行加载（`Promise.any`），自动故障转移
- **留言板**：基于 Netlify Blobs 的留言功能，支持回复、分页、IP 属地显示
- **密码保护**：SHA-256 哈希验证，通过 URL 路径映射访问加密文章
- **游戏随机推荐**：老虎机风格抽奖动画，`2^quality` 权重算法，弹簧回弹效果
- **BSOD 404 页面**：Windows 蓝屏死机风格的自定义 404 页面

## 技术架构

|     模块     |      技术方案       |  版本  |
| :----------: | :-----------------: | :----: |
|   构建工具   |       webpack       |  5.x   |
|   模板引擎   |         ejs         | 3.1.x  |
|   路由控制   |        pjax         | 0.2.8  |
| Markdown解析 |       marked        | 15.0+  |
|    UI框架    |       98.css        | 1.2.0  |
|  后端函数    |  Netlify Functions  |   -    |
|  数据存储    |   Netlify Blobs     |   -    |
|  配置转换    |    SheetJS (xlsx)   | 0.18+  |
|    包管理    |         npm         |  7.0+  |

## 项目结构

```
Emanon/
├── js/                        # 源码模块
│   ├── index.js               # Webpack 入口，初始化应用与 HMR
│   ├── main.js                # 应用核心，协调所有功能模块
│   ├── cdnLoader.js           # CDN 多源并行加载，自动故障转移
│   ├── langManager.js         # 多语言管理器 (v3.1)
│   ├── tabHandler.js          # 顶部导航选项卡
│   ├── progressBar.js         # 首页年/月/日进度条
│   ├── previewLoader.js       # 文章列表预览加载
│   ├── gallery.js             # 画廊图片列表
│   ├── gameList.js            # 游戏/记录列表
│   ├── gameRoll.js            # 游戏随机推荐（老虎机风格）
│   ├── dailyPopup.js          # 每日弹窗（含语言切换）
│   ├── messageBoard.js        # 留言板模块
│   ├── tips.js                # 鼠标悬停提示
│   ├── crtEffect.js           # CRT 扫描线特效
│   ├── logoRandomizer.js      # 顶部 Logo 随机切换
│   ├── password.js            # 访问密码验证（SHA-256）
│   ├── footerLoader.js        # 页脚加载（含 GitHub API）
│   └── scrollToTop.js         # 滚动监听与返回顶部
├── css/                       # 各页面样式
│   ├── style.css              # 全局样式入口（导入所有子样式）
│   ├── article.css
│   ├── gallery.css
│   ├── game.css
│   ├── daily.css
│   ├── about.css
│   ├── logo.css
│   ├── password.css
│   └── progress.css
├── ejs/
│   ├── pages/                 # 页面模板
│   │   ├── index.ejs          # 首页（年/月/日进度条）
│   │   ├── article.ejs        # 文章列表
│   │   ├── game.ejs           # 游戏列表 + 随机推荐
│   │   ├── gallery.ejs        # 画廊
│   │   ├── message.ejs        # 留言板
│   │   ├── about.ejs          # 关于页
│   │   └── password.ejs       # 密码验证页
│   └── templates/             # 公共模板片段
│       ├── header.ejs         # <head> 模板（charset/viewport/favicon）
│       └── function.ejs       # 底部组件（CRT/tips/返回顶部/footer）
├── cfg/
│   ├── article_cfg.json       # 文章列表配置（由 post.js 自动生成）
│   ├── gallery_cfg.json       # 画廊配置
│   ├── game_time_cfg.json     # 游戏/记录配置
│   ├── lang_cfg.json          # 多语言文本配置（~60+ 条目）
│   ├── system_cfg.json        # 系统配置（类型名/评级名/CDN后缀）
│   ├── excelToJson.js         # Excel→JSON 转换脚本
│   ├── excel/                 # Excel 源文件
│   └── trans_table_tool_v1.2.zip  # 配置表转换工具
├── post/
│   ├── _src/                  # Markdown 文章源文件
│   │   ├── post.js            # 文章构建脚本（Frontmatter + marked + html-minifier-terser）
│   │   ├── template.html      # 文章 HTML 模板（Win98 窗口风格）
│   │   └── _template.md       # 新文章 Frontmatter 模板
│   └── <文章名>/              # 构建产物，每篇文章一个文件夹
├── netlify/
│   └── functions/             # Netlify Serverless 函数
│       ├── get-messages.js    # GET：分页读取留言
│       └── post-message.js    # POST：发表留言（含 IP 属地解析）
├── page/                      # 构建产物 HTML 页面
├── ui/                        # UI 素材
│   ├── dailyPopup.html        # 欢迎弹窗 HTML
│   ├── logo1.txt / logo2.txt  # ASCII Art Logo
│   └── *.png / *.html         # 其他 UI 素材
├── icon/                      # 图标资源（38 个 PNG）
├── favicon/                   # 网站图标（ICO/PNG/SVG）
├── main.js                    # 打包产物（勿手动修改）
├── styles.css                 # 打包产物（勿手动修改）
├── index.html                 # 网站入口
├── 404.html                   # BSOD 风格 404 页面
├── netlify.toml               # Netlify 部署配置
├── site.webmanifest           # PWA 清单
├── webpack.config.js          # Webpack 配置
└── package.json
```

## 安装与运行

**环境要求**：Node.js 16+、npm 7+

```bash
# 安装依赖
npm install

# 本地开发（含 HMR 热更新）
npm start

# 构建文章 + 生产打包（完整流程）
npm run build

# 仅构建 Markdown 文章
npm run post

# 仅生产打包
npm run pack
```

## 开始使用

### 一、导航栏配置

在 `js/main.js` 中修改 `tabData` 数组，可增减导航选项卡：

```js
const tabData = [
  { url: '/', text: 'tab_progress' },
  { url: '/page/article.html', text: 'tab_article' },
  { url: '/page/game.html', text: 'tab_game' },
  { url: '/page/gallery.html', text: 'tab_gallery' },
  // 其他菜单项...
];
```

### 二、配置表转换

本项目使用 Excel 作为内容管理入口，编辑完成后需转换为 JSON 文件供程序读取。

**转换方式**：使用 `cfg/excelToJson.js` 脚本自动将 Excel 文件转换为 JSON：

```bash
# Excel 文件存放在 cfg/excel/ 文件夹内
# 运行脚本自动转换所有 Excel 文件到 cfg/ 目录
node cfg/excelToJson.js

# 或使用 npm 快捷命令
npm run cfg
```

**Excel 格式约定**：
- 第 1 行：备注（忽略）
- 第 2 行：数据类型（int / string / float / bool / int[]）
- 第 3 行：字段名
- 第 4 行起：数据行

**支持的数据类型**：
- `int` → 整数
- `string` → 字符串
- `float` → 浮点数
- `bool` → 布尔值（true/false/是/否 等）
- `int[]` → 整数数组（支持 `[1,2,3]` / `1,2,3` / `1 2 3` 格式）

### 三、文章功能

#### 3.1 创建新文章

在 `post/_src/` 目录下新建 `.md` 文件，使用 Frontmatter 定义元数据：

```markdown
---
title: 文章标题
icon: text-markdown.png
order: 1
hidden: false
---

正文内容（Markdown 格式）...
```

**Frontmatter 字段说明**：

| 字段     | 类型    | 必填 | 默认值              | 说明                           |
| :------: | :-----: | :--: | :-----------------: | :----------------------------: |
| title    | string  |  否  | 正文首行            | 文章标题                       |
| icon     | string  |  否  | text-markdown.png   | 文章列表图标（icon/ 目录下）   |
| order    | number  |  否  | 999                 | 排序权重，数字小的排前面       |
| hidden   | boolean |  否  | false               | 是否隐藏（不出现在文章列表中） |

> **注意**：以 `_` 开头的 `.md` 文件会被跳过（如 `_template.md`）。

#### 3.2 在 GitHub 上直接创建文章

点击以下链接可在 GitHub 网页上直接创建新文章，Frontmatter 模板已预填：

👉 [**新建文章**](https://github.com/jianzou1/Emanon/new/master/post/_src?filename=new_article.md&value=---%0Atitle%3A%20%E6%96%87%E7%AB%A0%E6%A0%87%E9%A2%98%0Aicon%3A%20text-markdown.png%0Aorder%3A%20999%0Ahidden%3A%20false%0A---%0A%0A%23%20%E6%96%87%E7%AB%A0%E6%A0%87%E9%A2%98%0A%0A%E6%AD%A3%E6%96%87%E5%86%85%E5%AE%B9...)

提交后 Netlify 会自动触发构建，无需本地操作。

也可参考 `post/_src/_template.md` 模板文件。

#### 3.3 构建命令

```bash
npm run post
```

- 解析 Frontmatter 元数据，将 Markdown 转换为 HTML
- 自动生成 `cfg/article_cfg.json`（仅包含非隐藏文章，按 order 排序）
- 隐藏文章仍会生成 HTML，可通过直接 URL 访问（如 `/post/文章名/`）

### 四、画廊功能

编辑 `cfg/gallery_cfg.json` 中的以下字段，管理画廊图片：

| 字段  | 备注                                     |
| ----- | ---------------------------------------- |
| id    | 用作排序，升序排列                       |
| mark  | 相同的值归为同一图片列表                 |
| url   | 图床链接                                 |
| page  | 相同 mark 中，图片展示所在页码           |
| title | 图片列表的标题名                         |

### 五、游戏列表功能

该功能同样可用作「观影记录」「读书笔记」等，编辑 `cfg/game_time_cfg.json` 中的以下字段：

| 字段                | 备注                                               |
| ------------------- | -------------------------------------------------- |
| id                  | 用作排序，升序排列                                 |
| name                | 名称                                               |
| sign                | 显示在时长前的标志                                 |
| time                | 游戏时长                                           |
| type                | 游戏类型（可在 `typeName` 中编辑类型名称）         |
| isLoved             | 是否喜爱                                           |
| seriesTag           | 系列标签，同系列项优先聚合展示                     |
| spacialAchievements | 特殊成就，配置后列表显示可展开的下拉样式           |
| quality             | 评级                                               |
| story               | 随机推荐功能的描述内容                             |

### 六、多语言系统

多语言管理器（`js/langManager.js`）版本 v3.1，支持 DOM 自动绑定、用户偏好缓存与 HTML 安全转义。

#### 6.1 新增语言

在 `ui/dailyPopup.html` 的 `<select id="lang-switcher">` 中新增对应的 `<option value="...">` 条目，同时在 `cfg/lang_cfg.json` 中补充对应的多语字段。

#### 6.2 新增翻译条目

为任意 HTML 标签添加 `data-lang-id` 属性，与 `lang_cfg` 配置表的主键对应，语言切换时自动替换文本：

```html
<span data-lang-id="your_key">默认文本</span>
```

输入框的 placeholder 支持 `data-lang-placeholder` 属性：

```html
<input data-lang-placeholder="your_placeholder_key" />
```

### 七、留言板功能

留言板基于 Netlify Functions + Netlify Blobs 实现，无需自建数据库。

#### 7.1 工作原理

- **发表留言**：前端 POST 请求 → `netlify/functions/post-message.js` → 写入 Netlify Blobs `guestbook` Store
- **读取留言**：前端 GET 请求 → `netlify/functions/get-messages.js` → 分页读取，每页 20 条
- **IP 属地**：优先读取 Netlify 注入的 `x-nf-geo` 请求头，回退到 `ipwho.is` API 查询
- **回复功能**：支持对留言进行回复，回复内容挂载在父留言下

#### 7.2 本地开发调试

留言板支持 Mock 数据模式，用于本地开发时无需 Netlify 环境：

```
# 方式一：URL 参数
http://localhost:8080/page/message.html?mockMessages=1

# 方式二：localStorage
localStorage.setItem('mockMessages', '1');
```

若需要在本地调用真实 Netlify Functions，请安装 [Netlify CLI](https://docs.netlify.com/cli/get-started/)：

```bash
npm install -g netlify-cli
netlify dev
```

### 八、密码保护文章

支持通过密码访问隐藏文章，密码不以明文存储。

#### 8.1 工作原理

1. 用户输入密码
2. 前端计算 SHA-256 哈希，取前 8 位十六进制字符
3. 使用 `fetch HEAD` 请求检测 `/post/{hash}/` 路径是否存在
4. 存在则通过 PJAX 导航到该文章

#### 8.2 新增加密文章

1. 选定密码（如 `mypassword`）
2. 计算 SHA-256 前 8 位：
   ```js
   // 浏览器控制台执行
   crypto.subtle.digest('SHA-256', new TextEncoder().encode('mypassword'))
     .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8))
     .then(console.log);
   ```
3. 将文章放入 `post/<hash>/index.html`（hash 为上一步输出）
4. 用户在密码页输入密码即可访问

### 九、CRT 显示器特效

全屏 Canvas 叠加层模拟 CRT 显示器效果（`js/crtEffect.js`），采用单例模式。

**视觉效果**：
- **RGB 扫描线**：红/绿/蓝三色通道分离的水平扫描线，带正弦抖动
- **桶形畸变**：模拟 CRT 显示器的曲面屏幕边缘变形
- **边缘暗角**：屏幕边缘逐渐变暗的 Vignette 效果
- **角落色差**：四角区域的色差偏移
- **随机闪烁**：模拟老旧 CRT 的信号不稳定

**用户控制**：
- 通过欢迎弹窗（`dailyPopup`）中的复选框开关
- 偏好持久化至 `localStorage`（键名：`crtEffectEnabled`）

### 十、404 蓝屏页面

`404.html` 模拟 Windows 蓝屏死机（BSOD）界面：
- 蓝底白字全屏布局，"Emanon OS" 品牌标识
- 按 Enter 键返回首页
- 内置 98.css CDN 容灾加载

### 十一、构建与部署

#### 11.1 命令说明

| 命令              | 说明                                            |
| ----------------- | ----------------------------------------------- |
| `npm start`       | 启动本地开发服务器，支持 HMR 热模块替换         |
| `npm run post`    | 仅构建 Markdown 文章为 HTML                     |
| `npm run pack`    | 仅执行 Webpack 生产打包                         |
| `npm run build`   | 构建文章 + 生产打包（完整流程，推荐使用）       |

#### 11.2 打包产物

生产打包（`npm run pack`）后，在根目录生成：

- `main.js`：合并压缩后的 JavaScript
- `styles.css`：合并压缩后的样式表
- `page/*.html`：各页面 HTML（由 EJS 模板生成）

#### 11.3 部署

**静态托管**（不含留言板功能）：

将整个项目目录上传至任意静态文件托管服务即可（GitHub Pages、Vercel 等）。

**Netlify 部署**（完整功能，含留言板）：

项目已配置 `netlify.toml`，推荐使用 Netlify 部署以启用留言板功能：

```toml
[build]
  command   = "npm run post && npm run pack"  # 文章构建 + Webpack 打包
  publish   = "."              # 发布目录（整个项目）
  functions = "netlify/functions"  # Serverless 函数目录

[build.environment]
  NODE_VERSION = "20"          # Node.js 版本
```

部署步骤：
1. 将项目推送到 GitHub/GitLab 仓库
2. 在 [Netlify](https://app.netlify.com/) 中连接仓库
3. Netlify 会自动识别 `netlify.toml` 配置并完成部署
4. 留言数据自动存储在 Netlify Blobs 中，无需额外配置数据库

## 模块架构

```
                   ┌─────────────┐
                   │  index.js   │  Webpack 入口
                   │  (HMR配置)  │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │   main.js   │  应用核心
                   │  (路由调度)  │
                   └──────┬──────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐     ┌─────▼─────┐   ┌─────▼──────┐
    │CDN加载器│     │多语言管理 │   │  Tab导航   │
    │cdnLoader│     │langManager│   │tabHandler  │
    └─────────┘     └───────────┘   └────────────┘
                          │
    ┌─────────┬───────────┼───────────┬──────────┐
    │         │           │           │          │
┌───▼───┐┌───▼───┐┌──────▼──┐┌──────▼──┐┌──────▼──┐
│进度条  ││文章   ││游戏列表 ││画廊     ││留言板   │
│progress││preview││gameList ││gallery  ││message  │
│Bar     ││Loader ││+Roll    ││         ││Board    │
└────────┘└───────┘└─────────┘└─────────┘└────┬────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │  Netlify Functions │
                                    │  get/post-messages │
                                    └───────────────────┘

    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
    │CRT特效  │ │密码验证 │ │每日弹窗 │ │其他工具  │
    │crtEffect│ │password │ │dailyPop │ │tips/logo/│
    │         │ │         │ │         │ │footer/...│
    └─────────┘ └─────────┘ └─────────┘ └──────────┘
```

## 数据流

```
Excel 文件 (cfg/excel/)
        │
        │ npm run cfg
        ▼
JSON 配置 (cfg/*.json) ──────► 前端模块读取渲染
        
Markdown 文件 (post/_src/*.md)
        │
        │ npm run post
        ▼
HTML 文章页 (post/<name>/index.html)
  + article_cfg.json (cfg/)

EJS 模板 (ejs/pages/*.ejs)
        │
        │ npm run pack (webpack)
        ▼
页面 HTML (page/*.html) + main.js + styles.css
```
