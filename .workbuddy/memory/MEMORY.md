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

## 文章构建管线（post/_src/post.js）
- Markdown 文件支持 frontmatter（`---` 分隔），字段：title、icon、order、hidden
- `post.js` 自动生成 `cfg/article_cfg.json`（过滤 hidden、按 order 排序）
- `cfg/excel/article_cfg.xlsx` 已删除，文章索引不再由 Excel 维护
- 隐藏文章仍会生成 HTML（可通过直接 URL 访问），只是不出现在文章列表中
