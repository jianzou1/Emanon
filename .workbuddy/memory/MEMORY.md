# MEMORY.md

## 项目：Emanon
- Windows 98 复古风格个人网站
- 作者：Shelton Chu
- 构建工具：webpack 5，打包命令 `npm run pack`
- 打包产物 `main.js` 和 `styles.css` 在根目录，经 TerserPlugin 混淆压缩，变量名会被重命名
- 入口：`js/index.js` → `js/main.js`（应用核心）
- 部署：Netlify，配置在 `netlify.toml`
  - 构建命令：`npm run build`（post → cfg → webpack production）
  - 安全头：X-Frame-Options(DENY) / X-Content-Type-Options(nosniff) / X-XSS-Protection / Referrer-Policy / Permissions-Policy

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
- 弹窗公共样式在 `daily.css` 中通过通用 class 选择器 `.popup-window` / `.popup-window p` / `.popup-confirm-btn` 定义（2026-04-02 从 ID 组迁移）
- 新增弹窗只需添加 `popup-window` class 即可自动继承公共样式，无需修改 CSS

## 公共工具模块
- `js/utils.js` — 导出 `escHtml` / `escAttr` / `getSystemValue` / `getLocalizedField(obj, field, lang)` / `normalizeGameData` / `parseKeys` / `parseConfigString` / `shuffleArray`
  - `getLocalizedField` 接收 lang 参数（避免 utils.js 依赖 langManager），调用处传入 `langManager.getCurrentLang()`
  - 供 gameList.js / gameRoll.js / gallery.js / messageBoard.js / previewLoader.js 共用
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

## 导航架构：SPA 化（2026-03-27 实施，2026-04-01 性能优化）
- **页签切换（优化后）**：细粒度内容替换 + Tab 栏保留，零网络请求
  - `TabHandler.htmlCache`（static Map）存储 URL → `{ inner, outer }` 结构化对象
    - `inner`: `.window-body` 内 tablist 之后的兄弟节点 HTML
    - `outer`: `.window-body` 之后的 `#main` 直接子元素 HTML（如 gallery 的 `#imageModal`）
  - 新增静态方法 `getContentHtml(mainEl)` / `replaceContent(mainEl, content)` — 提取/替换两层内容
  - 点击页签：缓存命中 → `replaceContent` 细粒度替换（Tab 栏保留不动）+ `history.pushState()` + `handlePageLoad(true)` 快速路径
  - `handlePageLoad(isTabSwitch)` 双路径：
    - `isTabSwitch=true`：跳过 refreshTabHandler / initCRT / safeBindSwitcher，只调 updateSelectedTab + `langManager.applyTranslationsIn(main)` 增量翻译
    - `isTabSwitch=false`：完整路径（PJAX / 首次加载）
  - `popstate`（捕获阶段）：replaceContent 成功 → 快速路径；失败（从非页签页后退，无 tablist）→ `main.innerHTML` 完整重写 + `handlePageLoad(false)`
- **langManager** 新增 `applyTranslationsIn(rootElement)`：仅扫描指定子树，不触发 safeBindSwitcher
- **footerLoader** 新增 `isTabSwitch` 参数：Tab 切换时检测 footer 是否已存在，已存在则跳过重建
- **PJAX 保留用途**：文章详情页（`/post/*`）、密码页等非页签页面（about 已改为弹窗模式）
- `TabHandler` 构造函数接收 4 参数：selector, tabData, pjaxInstance, onPageLoad
- `main.js` 中 handlePageLoad 声明在 refreshTabHandler 之前（作为参数传递）
- 2026-04-09：`handlePageLoad` 的 URL 分发由 `switch(currentUrl)` 改为 `js/pageRegistry.js` 的 `runPageModuleByUrl(url, context)` 注册表调度；页面模块依赖通过 context 注入（如 `pjax`、`setGameRollCleanup`），未命中 URL 保持 no-op
- 2026-04-09：`langManager.init()` 等待时机从 `window.load` 前移到 DOM ready（`DOMContentLoaded`/文档已可交互即执行），以缩短首屏翻译文本就绪时间

## PJAX 生命周期管理（2026-04-01 更新）
- `main.js` 中 handlePageLoad 开头调用 4 个 cleanup：cleanupProgressBar / cleanupGallery / cleanupScrollToTop / gameRollCleanup
- `scrollToTop.js` 导出 `initScrollToTop()` + `cleanupScrollToTop()`：清理 scroll 监听器 + button onclick；带 100ms throttle
- `gameRoll.js` 的 `initGameRoll()` 返回 cleanup 函数：清理 click 监听器 + 打字机 setTimeout + 动画 rAF
- `progressBar.js` 导出 `cleanupProgressBar()`：清理定时器 + visibilitychange 监听器；已统一使用 `import langManager`
- `gallery.js` 导出 `cleanupGallery()`：断开 IntersectionObserver + 移除 window click 监听器
- `tips.js` 使用事件委托（body 级 mouseover/mouseout），单例模式不需要 cleanup
- `dailyPopup.js`：interval=86400（24h）、通过 `showPopup()` 创建 DOM（不再 fetch HTML 模板）、`window.closePopup` 兼容旧版

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

## 数据预加载架构（2026-03-31 实施）
- `dataCache.js`：统一 JSON 缓存层，`fetchJSON(url)` 缓存 Promise（非结果），天然防竞态
  - `warmUpCache(urls)` 批量预热，静默 catch 不影响后续按需加载
- `main.js` 启动时序：`await langManager.init()` → 首屏渲染 → `prefetchMessages()` → `requestIdleCallback` 预热 4 个 JSON（article_cfg / game_time_cfg / system_cfg / gallery_cfg）
  - Safari fallback: `setTimeout(fn, 200)`；timeout 兜底: 3000ms
- `previewLoader.js` 已统一使用 `fetchJSON()` 替代原生 fetch，接入缓存层
- 消费者对照：gameList.js / gallery.js / previewLoader.js 全部通过 `fetchJSON()` 加载 JSON → 预热缓存自动命中
- `lang_cfg.json` 不参与预热（langManager 独立管理，最高优先级阻塞式 await）

## 文章构建管线（post/_src/post.js）
- Markdown 文件支持 frontmatter（`---` 分隔），字段：title、icon、order、hidden
- `post.js` 自动生成 `cfg/article_cfg.json`（过滤 hidden、按 order 排序）
- `cfg/excel/article_cfg.xlsx` 已删除，文章索引不再由 Excel 维护
- 隐藏文章仍会生成 HTML（可通过直接 URL 访问），只是不出现在文章列表中

## 通用弹窗组件（2026-04-02 实施）
- `js/popup.js`：导出 `showPopup(options)` — 统一封装 overlay + Win98 弹窗创建/关闭/键盘交互
  - 参数：`id` / `title` / `titleLangId` / `bodyHTML` / `confirmLangId` / `confirmText` / `overlayClose` / `onClose` / `onReady`
  - 关闭方式：ESC / Enter / 遮罩点击（可配置） / 确认按钮 / 标题栏×按钮，五种统一支持
  - 关闭行为：`remove()` 彻底清理 DOM + keydown 监听器
  - 防重复打开：通过 `document.getElementById(id)` 检测
  - CSS class：自动添加 `popup-window`（继承公共样式）+ `.popup-confirm-btn` + `.popup-close-icon`
  - 返回 `{ close }` 对象供外部手动关闭
- 三个弹窗均已改造使用 `showPopup()`：
  - `dailyPopup.js`：不再 fetch HTML 模板，直接在 JS 中构建 bodyHTML
  - `password.js`：`showPasswordError` 使用 `showPopup()` + `onClose` 回调恢复 inputListener
  - `aboutPopup.js`：使用 `showPopup()` + `onReady` 回调绑定多语言和密码图标

## 关于弹窗（2026-04-02 实施）
- `js/aboutPopup.js`：新模块，导出 `showAboutPopup()`
  - createElement 动态创建（参照 password.js 的 showPasswordError 模式）
  - 关闭时 `remove()` 彻底清理 DOM + keydown 监听器
  - 防重复打开：检测 `#about-popup` 是否已存在
  - 多语言：注入后调用 `langManager.applyTranslationsIn(popup)`
  - 密码快捷图标：关闭弹窗后通过 fakeLink + data-pjax-url 触发全局委托导航
  - 外部链接添加 `target="_blank"` + `data-no-pjax`
- `footerLoader.js`：页脚"关于"链接改为 `<a href="#" data-about-popup data-no-pjax>`
- `main.js`：import aboutPopup；全局点击委托中优先拦截 `[data-about-popup]` → `showAboutPopup()`
- `css/about.css`：新增 `#about-popup` 宽度 450px + `.about-popup-icon` 图标容器样式
- `page/about.html` 和 `ejs/pages/about.ejs` 保留不删除，作为直接 URL 访问兜底

## 留言板 Blob Key 设计（2026-05-25 重构）
- Store：单一 `guestbook`（未拆分主/回复 store —— Netlify Blobs 是逻辑命名空间，拆 store 不带来性能/事务收益，反增迁移成本）
- Key 前缀（双前缀，post-message.js / get-messages.js 中作为常量定义）：
  - 主留言：`msg:<reverseTs>:<id>` —— `reverseTs = 9999999999999 - now`（13 位）保证字典序倒排
  - 回复：  `re:<replyTo>:<reverseTs>:<id>` —— 前缀含父 messageId，可按主留言精确 list 回复
- 写入（`post-message.js`）：根据 `isReply` 选择前缀
- 读取（`get-messages.js`）：`Promise.all` 同时 list 两个前缀合并 blobs；分类以 `entry.replyTo` 字段为权威（兼容旧数据：旧回复仍在 `msg:` 前缀下，靠字段而非 key 分类）
- 旧数据无需迁移；前端 `blobKey` 仅 DEBUG_MODE 下展示，不解析前缀
- 前端 → 后端的 `messageId="re:<parentId>"` 协议（form hidden input）与 blob key 是两个层面，不要混淆
