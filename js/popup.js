// popup.js — 通用弹窗组件
// 统一封装 overlay + Win98 风格窗口的创建/关闭/键盘交互

/**
 * 显示一个通用弹窗
 * @param {Object} options 弹窗配置
 * @param {string} options.id           - 弹窗 ID（用于防重复打开 + CSS 选择器）
 * @param {string} options.title        - 标题栏文字（纯文本）
 * @param {string} [options.titleLangId]- 标题栏 data-lang-id（多语言）
 * @param {string} options.bodyHTML     - window-body 内的 HTML 内容
 * @param {string} [options.confirmLangId] - 确认按钮 data-lang-id，默认 'btn_ok'
 * @param {string} [options.confirmText]   - 确认按钮文字，默认 'OK'
 * @param {boolean} [options.overlayClose] - 点击遮罩关闭，默认 true
 * @param {Function} [options.onClose]     - 关闭后的回调
 * @param {Function} [options.onReady]     - DOM 注入后的回调（接收 { popup, overlay, close }）
 * @param {Function} [options.onHelp]      - 提供时标题栏渲染 ? 按钮，点击回调（接收 { popup, overlay, close }）
 * @returns {{ close: Function }} 返回含 close 方法的对象，可供外部手动关闭
 */
export function showPopup({
  id,
  title = '',
  titleLangId = '',
  bodyHTML = '',
  confirmLangId = 'btn_ok',
  confirmText = 'OK',
  overlayClose = true,
  onClose = null,
  onReady = null,
  onHelp = null,
}) {
  // 防重复打开
  if (document.getElementById(id)) {
    return { close: () => {} };
  }

  // ── 遮罩层 ──
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = `${id}-overlay`;

  // ── 弹窗主体 ──
  const popup = document.createElement('div');
  popup.id = id;
  popup.className = 'window popup-window';
  popup.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-text"${titleLangId ? ` data-lang-id="${titleLangId}"` : ''}>${title}</div>
      <div class="title-bar-controls">
        ${onHelp ? '<button aria-label="Help" class="popup-help-icon"></button>' : ''}
        <button aria-label="Close" class="popup-close-icon"></button>
      </div>
    </div>
    <section class="window-body">
      ${bodyHTML}
    </section>
    <div class="popup-footer">
      <button class="popup-confirm-btn" data-lang-id="${confirmLangId}">${confirmText}</button>
    </div>
  `;

  document.body.append(overlay, popup);

  // ── 关闭逻辑 ──
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
    popup.remove();
    onClose?.();
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Escape' && e.key !== 'Enter') return;
    // 只让最上层弹窗响应，避免多层弹窗被一次按键全部关掉
    const popups = document.querySelectorAll('.popup-window');
    if (popups[popups.length - 1] !== popup) return;
    close();
  };

  // ── 事件绑定 ──
  document.addEventListener('keydown', handleKeyDown);

  popup.querySelector('.popup-confirm-btn').addEventListener('click', close);
  popup.querySelector('.popup-close-icon')?.addEventListener('click', close);
  popup.querySelector('.popup-help-icon')?.addEventListener('click', () => {
    onHelp?.({ popup, overlay, close });
  });

  if (overlayClose) {
    overlay.addEventListener('click', close);
    popup.addEventListener('click', e => e.stopPropagation());
  }

  // ── 就绪回调 ──
  onReady?.({ popup, overlay, close });

  return { close };
}
