// scrollToTop.js

let scrollHandler = null;
let button = null;

const THROTTLE_MS = 100;
const SCROLL_THRESHOLD = 300;

/**
 * 初始化回到顶部按钮：绑定 scroll 监听器（带 throttle）和 click 事件。
 * 每次 PJAX 导航后由 main.js handlePageLoad 调用。
 */
export function initScrollToTop() {
  // 先清理上一次绑定
  cleanupScrollToTop();

  button = document.querySelector('.back-to-top');
  if (!button) return;

  // 初始状态
  button.style.display = window.scrollY > SCROLL_THRESHOLD ? 'block' : 'none';

  // click 事件只绑一次（cleanup 时移除）
  button.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // 带时间戳 throttle 的 scroll 处理
  let lastRun = 0;
  scrollHandler = () => {
    const now = performance.now();
    if (now - lastRun < THROTTLE_MS) return;
    lastRun = now;
    if (button) {
      button.style.display = window.scrollY > SCROLL_THRESHOLD ? 'block' : 'none';
    }
  };

  window.addEventListener('scroll', scrollHandler, { passive: true });
}

/**
 * 清理回到顶部模块的 scroll 监听器。
 * 在 handlePageLoad 开头调用，防止 SPA 导航累积监听器。
 * 幂等：多次调用不报错。
 */
export function cleanupScrollToTop() {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  if (button) {
    button.onclick = null;
    button = null;
  }
}
