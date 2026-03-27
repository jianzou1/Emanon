# MEMORY.md

## 项目：Emanon
- Windows 98 复古风格个人网站
- 作者：Shelton Chu
- 构建工具：webpack 5，打包命令 `npm run pack`
- 打包产物 `main.js` 和 `styles.css` 在根目录，经 TerserPlugin 混淆压缩，变量名会被重命名
- 入口：`js/index.js` → `js/main.js`（应用核心）
- 部署：Netlify，配置在 `netlify.toml`

## CRT 效果（js/crtEffect.js）
- 全屏 Canvas 叠加层，RGB 扫描线 + 桶形畸变 + 边缘暗角 + 四角色差
- 2026-03-26 性能优化：扫描线路径合并（3 次 stroke/帧）、OffscreenCanvas 缓存暗角/四角（按阈值重绘）、CSS contain/will-change
- 用户明确要求：不允许修改现有画面表现

## 用户偏好
- 用户对 CRT 闪烁效果敏感，之前的降频更新（每 N 帧更新）导致闪烁变强烈被否决
- 构建验证时注意：产物被 terser 混淆，不能用原始变量名搜索

## CSS 设计令牌（2026-03-27 新增）
- `:root` 变量定义在 `css/style.css` 顶部
- 字体：`--font-ui`（Pixelated MS Sans Serif）、`--font-body`（Microsoft Yahei）、`--font-mono`（Courier New）
- 颜色：`--color-win-blue`(#000080)、`--color-win-gray`(#c0c0c0)、`--color-bg`(#EBECE8)、`--color-text-*`系列、`--color-border*`系列、`--color-error`(#cc0000)
- z-index 分层：`--z-base`(1) → `--z-back-to-top`(99) → `--z-modal`(100) → `--z-overlay`(299) → `--z-popup`(300) → `--z-crt`(5000) → `--z-tooltip`(9000) → `--z-toast`(9999)
- 弹窗公共样式在 `daily.css` 中通过 `#welcome-popup, #password-error-popup` 选择器组合定义

## 公共工具模块
- `js/utils.js` — 导出 `escHtml` / `escAttr`，供 messageBoard.js 和 gameList.js 共用
- `js/messageBoardMock.js` — 留言板 Mock 数据，通过 dynamic import 分离为独立 chunk，生产环境按需加载不进主 bundle

## 游戏列表多语言
- 排序选项 radio value 已改为语言无关标识符：`sort_quality` / `sort_type` / `sort_time`
- 评级名（大师之作等）和类型名（竞技类等）通过 `langManager.translate('game_quality_N')` / `langManager.translate('game_type_N')` 获取
- 排序缓存 key 为 `${sortOption}_${lang}`，语言切换时通过监听 `#lang-switcher` change 自动清缓存+重渲染
- `getLocalizedField(game, field)` 支持读取 `field_en` / `field_jp` 多语言字段，fallback 到原始中文
- game_time_cfg.json 数据层多语言字段（story_en/story_jp/name_en/name_jp）待人工补充
- `parseKeys(str)` 从 system_cfg 的 value 字符串中提取有序 key 数组（不再解析中文名称）

## webpack 配置
- DefinePlugin 提供 `__BUILD_HASH__`（构建哈希）和 `__DEV__`（开发模式标志）
- TerserPlugin 配置了 `drop_console: true`（生产环境移除 console）

## 导航架构：SPA 化（2026-03-27 实施）
- **页签切换**：内存缓存 + innerHTML 替换，零网络请求
  - `TabHandler.htmlCache`（static Map）存储 URL → #main innerHTML
  - 首次加载缓存当前页，`preloadTabs()` fetch + DOMParser 提取其他页签
  - 点击页签：缓存命中 → innerHTML 注入 + `history.pushState()`；缓存 miss → fallback PJAX
  - `popstate`（捕获阶段）：缓存命中时 `stopImmediatePropagation()` 阻止 PJAX 的 popstate 处理，直接恢复缓存内容
- **PJAX 保留用途**：文章详情页（`/post/*`）、密码页、about 页等非页签页面
- `handlePageLoad()` 内部调用 `langManager.applyTranslations()`，不再在 pjax:complete 中单独调用
- `TabHandler` 构造函数接收 4 参数：selector, tabData, pjaxInstance, onPageLoad
- `main.js` 中 handlePageLoad 声明在 refreshTabHandler 之前（作为参数传递）

## PJAX 生命周期管理（2026-03-26 新增）
- `main.js` 中 handlePageLoad 开头调用各模块的 cleanup 函数（cleanupProgressBar / cleanupGallery）
- `progressBar.js` 导出 `cleanupProgressBar()`：清理定时器 + visibilitychange 监听器
- `gallery.js` 导出 `cleanupGallery()`：断开 IntersectionObserver + 移除 window click 监听器
- `tips.js` 使用事件委托（body 级 mouseover/mouseout），单例模式不需要 cleanup

## CSS 移动端优化（2026-03-28 实施）
- 全局 `body` 添加 `overflow-wrap: break-word`
- tab 菜单 `width: 75px` → `min-width: 75px`
- `.window`/`.logo` 移动端 `max-width: 375px` → `calc(100vw - 16px)` 自适应
- `status-bar p` 移动端字号 12px → 13px；`ul.tree-view li` 移动端 11px → 12px
- `password.css` 新增 `@media(max-width:768px)` 断点：输入框 height 36px / width 100% / font-size 16px
- `message.css` 新增移动端断点：分页按钮 height 36px、回复按钮 padding 扩展触摸区域、全局字号提升、输入框 16px
- `about.css` 新增移动端断点：表格 `display:block; overflow-x:auto`
- `article.css` 移动端 `.link-title` max-width 55px → 72px
- 全部 6 处 `:hover` 迁移至 `@media(hover:hover)` 包裹，添加 `:active` 触摸替代（logo/article/about/message×3）
- `game.css`：tree-view `!important` 替换为高特异性选择器；`.scroll-container` 移除 `will-change` 常驻（JS 内联已设置，不影响功能）
- `daily.css` 移动端弹窗 `width:auto`、字号 12px → 13px
- `progress.css` 新增移动端断点：`#refresh-timer` 11px → 12px、`.progress-text` 12px → 13px
- `gallery.css` 无需修改（已有良好实践）
- CRT 效果未触碰（用户要求不改）

## 文章构建管线（post/_src/post.js）
- Markdown 文件支持 frontmatter（`---` 分隔），字段：title、icon、order、hidden
- `post.js` 自动生成 `cfg/article_cfg.json`（过滤 hidden、按 order 排序）
- `cfg/excel/article_cfg.xlsx` 已删除，文章索引不再由 Excel 维护
- 隐藏文章仍会生成 HTML（可通过直接 URL 访问），只是不出现在文章列表中
