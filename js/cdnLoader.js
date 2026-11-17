// cdn-loader.js
// 负责在运行时从多个 CDN 源加载 pjax。
// 98.css 已改为在 HTML head 中通过 <link rel="preload" as="style"> 异步应用
// （见 ejs/templates/header.ejs），不再走 JS 注入，这里只保留脚本加载能力。
import CDN_CONFIG from '../cfg/cdn.json';

// 通用加载函数 - 支持多个备用源
const loadScript = (urls) => {
  const urlList = Array.isArray(urls) ? urls : [urls];

  // 并行 fetch 多个源，优先使用第一个成功返回的内容（避免多个脚本同时执行）
  const fetchPromises = urlList.map(url =>
    fetch(url, { mode: 'cors' }).then(resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      return resp.text().then(code => ({ url, code }));
    })
  );

  // 首选 Promise.any（第一个 fulfilled），浏览器环境现代均支持
  return Promise.any(fetchPromises)
    .then(({ url, code }) => {
      // 注入脚本内容为 blob，避免其他源的脚本也被执行
      const blob = new Blob([code], { type: 'text/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = blobUrl;
        script.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve();
        };
        script.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error(`Script injection failed for ${url}`));
        };
        document.head.appendChild(script);
      });
    })
    .catch(() => {
      // Promise.any 在所有 promise 都 reject 时会到这里（AggregateError）
      // 回退到顺序加载（通过创建 script 标签）以兼容无法 fetch 的跨域源
      return new Promise((resolve, reject) => {
        let idx = 0;
        const tryLoadSequential = () => {
          if (idx >= urlList.length) {
            reject(new Error(`Failed to load script from all sources: ${urlList.join(', ')}`));
            return;
          }

          const url = urlList[idx++];
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => {
            resolve();
          };
          script.onerror = () => {
            tryLoadSequential();
          };
          document.head.appendChild(script);
        };
        tryLoadSequential();
      });
    });
};

/**
 * 按需加载 pjax 并返回其构造器。
 * 调用方通常通过 main.js 的 getPjax() 惰性单例间接使用，
 * 以保证首屏渲染不被这 5 个 CDN 源的下载阻塞。
 */
export const loadPjax = () => loadScript(CDN_CONFIG.pjax).then(() => window.Pjax);
