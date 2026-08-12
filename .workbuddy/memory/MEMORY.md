# MEMORY.md

## 项目：Emanon
- Windows 98 复古风格个人网站，作者 Shelton Chu
- 构建：webpack 5，`npm run pack`；产物 `main.js`/`styles.css` 在根目录，经 TerserPlugin 混淆（变量名重命名，`drop_console:true`）
- 入口：`js/index.js` → `js/main.js`；部署 Netlify（`netlify.toml`，`npm run build` = post→cfg→webpack prod，含安全头）
- 验证注意：产物被 terser 混淆，不能用原始变量名搜索

## CRT 效果（js/crtEffect.js）
- 全屏 Canvas 叠加层：RGB 扫描线 + 桶形畸变 + 边缘暗角 + 四角色差
- **硬约束：不允许修改画面表现；不接受降频更新（会导致闪烁变明显，已否决）**
- 已有优化：扫描线同色合并 Path（3 次 stroke/帧）、OffscreenCanvas 缓存暗角/四角（按 STATIC_PHASE_THRESHOLD 重绘）、CSS contain/will-change
- 性能基线（1280×800 软件渲染）：CRT 开 54 FPS / 关 60.2 FPS，每帧多耗 ~1.6ms
- 基准脚本：`C:\Users\sheltonzhu\.workbuddy\binaries\node\workspace\crt-fps-bench.js`（playwright-core + 系统 Edge，`--disable-gpu`）
- 2026-08-12：pow 查表优化（Float32Array LUT 替代每帧 ~570 次 Math.pow + 几何常量预缓存）

## 用户偏好
- 对 CRT 闪烁敏感，CRT 优化不能改变既有画面表现

## CSS 设计令牌
- `:root` 变量在 `css/style.css` 顶部：字体（`--font-ui`/`--font-body`/`--font-mono`）、颜色（`--color-win-blue`#000080 等）、z-index 分层（base 1→crt 5000→tooltip 9000→toast 9999）
- 弹窗公共样式：`daily.css` 中 `.popup-window`/`.popup-window p`/`.popup-confirm-btn` 通用 class，新弹窗加 `popup-window` 即可继承
- 移动端断点优化已完成（6 处 :hover 迁移至 `@media(hover:hover)`，各模块自适应字号/触摸区）

## 公共工具模块
- `js/utils.js`：`escHtml`/`escAttr`/`getSystemValue`/`getLocalizedField(obj,field,lang)`/`normalizeGameData`/`parseKeys`/`parseConfigString`/`shuffleArray`；`getLocalizedField` 调用处传入 `langManager.getCurrentLang()`
- `js/messageBoardMock.js`：留言板 Mock，dynamic import 独立 chunk

## 游戏列表多语言
- 排序 radio value 语言无关：`sort_quality`/`sort_type`/`sort_time`；评级/类型名走 `langManager.translate('game_quality_N'/'game_type_N')`
- 排序缓存 key `${sortOption}_${lang}`，语言切换时清缓存重渲染
- `getLocalizedField` 读 `field_en`/`field_jp` fallback 中文；game_time_cfg 多语言字段待人工补充
- `parseKeys` 从 system_cfg value 提取有序 key 数组

## webpack
- DefinePlugin：`__BUILD_HASH__`、`__DEV__`

## 导航架构：SPA 化
- **页签切换**：`TabHandler.htmlCache`（static Map，URL→{inner,outer}）细粒度替换内容 + Tab 栏保留，零网络请求；`getContentHtml`/`replaceContent` 提取/替换两层内容
- `handlePageLoad(isTabSwitch)` 双路径：true→跳过 refreshTabHandler/initCRT/safeBindSwitcher，仅 updateSelectedTab + `langManager.applyTranslationsIn(main)`；false→完整 PJAX/首次加载
- `popstate`（捕获阶段）：replaceContent 成功走快速路径，失败则 `main.innerHTML` 重写 + `handlePageLoad(false)`
- `langManager.applyTranslationsIn(root)` 仅扫描子树；`footerLoader(isTabSwitch)` 已存在则跳过重建
- PJAX 保留：文章详情 `/post/*`、密码页（about 已改弹窗）
- `TabHandler(selector, tabData, pjaxInstance, onPageLoad)`；handlePageLoad 声明在 refreshTabHandler 之前
- 2026-04-09：URL 分发改用 `js/pageRegistry.js` 的 `runPageModuleByUrl(url, context)` 注册表，依赖经 context 注入；`langManager.init()` 前移到 DOM ready

## PJAX 生命周期
- `main.js` handlePageLoad 开头调 4 个 cleanup：cleanupProgressBar/cleanupGallery/cleanupScrollToTop/gameRollCleanup
- 各模块均导出 init+cleanup：scrollToTop(100ms throttle)、gameRoll(返回 cleanup)、progressBar、gallery(IntersectionObserver+window click)
- tips.js 事件委托单例无需 cleanup；dailyPopup：interval=86400，`showPopup()` 创建 DOM，`window.closePopup` 兼容

## 数据预加载
- `js/dataCache.js`：`fetchJSON(url)` 缓存 Promise（防竞态）、`warmUpCache(urls)` 静默预热
- 启动时序：`await langManager.init()` → 首屏 → `prefetchMessages()` → `requestIdleCallback` 预热 4 JSON（Safari fallback setTimeout 200，兜底 3000ms）
- 消费者 gameList/gallery/previewLoader 全走 `fetchJSON()`；`lang_cfg.json` 不预热（langManager 阻塞式 await）

## 文章构建管线（post/_src/post.js）
- Markdown 支持 frontmatter（title/icon/order/hidden）；自动生成 `cfg/article_cfg.json`（过滤 hidden、按 order 排序）
- 隐藏文章仍生成 HTML（直链可访问），不出现在列表

## 通用弹窗组件（js/popup.js）
- `showPopup(options)`：id/title/titleLangId/bodyHTML/confirmLangId/confirmText/overlayClose/onClose/onReady
- 五种关闭：ESC/Enter/遮罩/确认/×按钮；`remove()` 清理 DOM+监听；防重复（getElementById 检测）
- CSS：自动加 `popup-window`+`.popup-confirm-btn`+`.popup-close-icon`；返回 `{close}`
- 已改造：dailyPopup（JS 构建 bodyHTML）、password（showPasswordError+onClose 恢复 inputListener）、aboutPopup（onReady 绑多语言+密码图标）
- aboutPopup：`footerLoader` "关于"链接改 `<a data-about-popup data-no-pjax>`；main.js 全局委托拦截；`page/about.html`/`ejs/pages/about.ejs` 保留作直链兜底

## 留言板 Blob Key（2026-05-25）
- Store：单一 `guestbook`（不拆分，Netlify Blobs 是逻辑命名空间）
- Key：主留言 `msg:<reverseTs>:<id>`（reverseTs=9999999999999-now 倒排）；回复 `re:<replyTo>:<reverseTs>:<id>`
- 写 `post-message.js` 按 isReply 选前缀；读 `get-messages.js` Promise.all list 两前缀合并，以 `entry.replyTo` 字段为权威分类（兼容旧数据）
- 旧数据无需迁移；前端 `messageId="re:<parentId>"` 协议与 blob key 是两个层面
