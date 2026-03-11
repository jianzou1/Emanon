# Emanon

一个基于 Windows 98 复古风格的纯前端个人网站，无需后端服务，静态托管即可部署。

## 核心特性

- **纯前端架构**：无需数据库与后端服务，静态文件托管即可部署
- **Markdown 优先**：内置 marked 解析器，支持标准语法扩展
- **无刷新导航**：集成 pjax 实现平滑页面切换
- **复古 UI**：基于 98.css 还原 Windows 98 系统视觉
- **多语言系统**：动态语言切换与文本本地化管理（v3.1），用户偏好持久化缓存
- **配置驱动**：Excel 表格驱动的内容管理，自动化生成 JSON 配置
- **CRT 特效**：可开关的 CRT 扫描线特效，偏好持久化至 localStorage
- **CDN 容灾**：pjax 等 CDN 资源支持多源并行加载，自动故障转移

## 技术架构

|     模块     |    技术方案    |  版本  |
| :----------: | :------------: | :----: |
|   构建工具   |    webpack     |  5.x   |
|   模板引擎   |      ejs       | 3.1.x  |
|   路由控制   |      pjax      | 0.2.8  |
| Markdown解析 |     marked     | 15.0+  |
|    UI框架    |     98.css     | 1.2.0  |
|    包管理    |      npm       |  7.0+  |

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
│   ├── gameRoll.js            # 游戏随机推荐
│   ├── dailyPopup.js          # 每日弹窗（含语言切换）
│   ├── tips.js                # 鼠标悬停提示
│   ├── crtEffect.js           # CRT 扫描线特效
│   ├── logoRandomizer.js      # 顶部 Logo 随机切换
│   ├── password.js            # 访问密码验证
│   ├── footerLoader.js        # 页脚加载
│   └── scrollToTop.js         # 滚动监听与返回顶部
├── css/                       # 各页面样式
│   ├── style.css              # 全局样式
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
│   │   ├── index.ejs
│   │   ├── article.ejs
│   │   ├── gallery.ejs
│   │   ├── game.ejs
│   │   ├── about.ejs
│   │   └── password.ejs
│   └── templates/             # 公共模板片段
│       ├── header.ejs
│       └── function.ejs
├── cfg/
│   ├── article_cfg.json       # 文章列表配置
│   ├── gallery_cfg.json       # 画廊配置
│   ├── game_time_cfg.json     # 游戏/记录配置
│   ├── lang_cfg.json          # 多语言文本配置
│   ├── excel/                 # Excel 源文件
│   └── trans_table_tool_v1.2.zip  # 配置表转换工具
├── post/
│   ├── _src/                  # Markdown 文章源文件
│   │   └── post.js            # 文章构建脚本
│   └── <文章名>/              # 构建产物，每篇文章一个文件夹
├── page/                      # 构建产物 HTML 页面
├── ui/                        # UI 素材（ASCII 图、弹窗 HTML）
├── icon/                      # 图标资源
├── favicon/                   # 网站图标
├── main.js                    # 打包产物（勿手动修改）
├── styles.css                 # 打包产物（勿手动修改）
├── index.html                 # 网站入口
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

#### 3.1 文章内容构建

Markdown 源文件存放于 `post/_src/`，新增文章后运行以下命令构建：

```bash
npm run post
```

- 构建后会在 `post/` 下生成与 Markdown 文件名同名的文章文件夹
- 建议文件名使用英文，避免路径编码问题
- Markdown **首行**内容将作为文章页面的 `<title>` 标题

#### 3.2 文章入口编辑

编辑 `cfg/article_cfg.json`（或对应 Excel）中的以下字段，使文章在列表页可见：

| 字段 |      描述      |     示例值      |
| :--: | :------------: | :-------------: |
|  id  | 排序ID（升序） |      1001       |
| url  |   文章目录名   | 2023-tech-guide |
| icon |   图标文件名   |   article.svg   |
| name |    显示标题    |    技术指南     |

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

### 七、构建与部署

#### 7.1 命令说明

| 命令              | 说明                                            |
| ----------------- | ----------------------------------------------- |
| `npm start`       | 启动本地开发服务器，支持 HMR 热模块替换         |
| `npm run post`    | 仅构建 Markdown 文章为 HTML                     |
| `npm run pack`    | 仅执行 Webpack 生产打包                         |
| `npm run build`   | 构建文章 + 生产打包（完整流程，推荐使用）       |

#### 7.2 打包产物

生产打包（`npm run pack`）后，在根目录生成：

- `main.js`：合并压缩后的 JavaScript
- `styles.css`：合并压缩后的样式表
- `page/*.html`：各页面 HTML（由 EJS 模板生成）

#### 7.3 部署

将整个项目目录（含静态资源）上传至任意支持静态文件的托管服务即可，无需服务端环境。
