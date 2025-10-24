// cdn-loader.js

// 定义 CDN 配置
export const CDN_CONFIG = {
    pjax: 'https://npm.onmicrosoft.cn/pjax@0.2.8/pjax.min.js'
  };
  
  
  // 动态加载 PJAX（返回 Promise）
  const loadPjax = () => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN_CONFIG.pjax;
    script.onload = () => resolve(window.Pjax); // 暴露 PJAX 类
    script.onerror = reject;
    document.head.appendChild(script);
  });
  
  // 统一加载所有资源
  export const loadResources = async () => {
    const Pjax = await loadPjax();
    return { Pjax }; // 返回 PJAX 供主模块使用
  };