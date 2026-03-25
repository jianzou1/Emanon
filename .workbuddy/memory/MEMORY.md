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
