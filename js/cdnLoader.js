// cdn-loader.js

// 定义 CDN 配置 - 支持多个备用源
export const CDN_CONFIG = {
  pjax: [
    'https://github.elemecdn.com/pjax@0.2.8/pjax.min.js',
    'https://cdn.jsdelivr.net/npm/pjax@0.2.8/pjax.min.js',
    'https://unpkg.com/pjax@0.2.8/pjax.min.js'
  ]
};

// 通用加载函数 - 支持多个备用源
const loadScript = (urls) => new Promise((resolve, reject) => {
  // 如果 urls 是字符串，转换为数组
  const urlList = Array.isArray(urls) ? urls : [urls];
  
  let currentIndex = 0;
  
  const tryLoad = () => {
    if (currentIndex >= urlList.length) {
      reject(new Error(`Failed to load script from all sources: ${urlList.join(', ')}`));
      return;
    }
    
    const url = urlList[currentIndex];
    const script = document.createElement('script');
    script.src = url;
    
    script.onload = () => {
      console.log(`✓ Successfully loaded from: ${url}`);
      resolve();
    };
    
    script.onerror = () => {
      console.warn(`✗ Failed to load from: ${url}, trying next...`);
      currentIndex++;
      tryLoad();
    };
    
    document.head.appendChild(script);
  };
  
  tryLoad();
});

// 动态加载 PJAX
const loadPjax = () => loadScript(CDN_CONFIG.pjax).then(() => window.Pjax);

// 统一加载所有资源
export const loadResources = async () => {
  try {
    const Pjax = await loadPjax();
    return { Pjax };
  } catch (error) {
    console.error('Failed to load resources:', error);
    throw error;
  }
};