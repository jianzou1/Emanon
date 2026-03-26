// utils.js — 公共工具函数

/**
 * HTML 转义：防止 XSS 注入
 * 将 & < > " ' 替换为对应的 HTML 实体
 */
export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML 属性值转义：在 escHtml 基础上额外转义反引号
 */
export function escAttr(str) {
  return escHtml(str).replace(/`/g, '&#96;');
}
