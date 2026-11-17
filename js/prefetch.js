// prefetch.js — 非关键预取的统一调度
// 两件事：
//   1. 判断这个用户该不该被预取（省流模式 / 2G 级网络直接放弃）
//   2. 把预取任务推迟到浏览器空闲时段，而不是首屏渲染期间抢带宽

/**
 * 省流 / 弱网判断。
 * 注意：navigator.connection 仅 Chromium 系提供，Safari 与 Firefox 上是 undefined，
 * 此处按「不跳过」处理——它是一条能拦就拦的加分判断，不是硬护栏。
 */
export const shouldSkipPrefetch = () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData === true) return true;
    return conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
};

/**
 * 空闲调度。
 * 优先 requestIdleCallback；不支持的浏览器（Safari）等 load 事件之后再延迟，
 * 避免早期 setTimeout(200) 那样在首帧阶段就开抢带宽。
 *
 * @param {Function} callback
 * @param {{timeout?: number, fallbackDelay?: number}} options
 */
export const onIdle = (callback, { timeout = 3000, fallbackDelay = 1200 } = {}) => {
    if (typeof requestIdleCallback === 'function') {
        return requestIdleCallback(callback, { timeout });
    }

    const run = () => setTimeout(callback, fallbackDelay);
    if (document.readyState === 'complete') {
        run();
    } else {
        window.addEventListener('load', run, { once: true });
    }
    return null;
};
