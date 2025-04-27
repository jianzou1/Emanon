// preload.js

/**
 * 默认预加载配置（内置配置）
 * 按优先级分组，每组内的资源并行加载，组间顺序加载
 */
const DEFAULT_PRELOAD_CONFIG = [
    // 最高优先级 - 核心样式与脚本
    [
      '/cfg/article_cfg.json',
      '/cfg/game_time_cfg.json',
      '/cfg/gallery_cfg.json'
    ],
    
    // 中等优先级 - 公共资源
    [
      '/icon/application-x-gamecube-rom.png',
      '/icon/application-x-genesis-rom.png',
      '/icon/application-x-nes-rom.png',
      '/icon/text-markdown.png',
      '/icon/computer-fail.png'
    ],
    
    // 低优先级 - 可选功能资源
    [
      '/favicon/android-chrome-192x192.png'
    ]
  ];
  
  /**
   * 资源类型映射表 (扩展名 -> preload类型)
   * 确保浏览器正确分配优先级和缓存策略
   */
  const RESOURCE_TYPES = {
    js: 'script',
    css: 'style',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
    svg: 'image',
    woff2: 'font',
    woff: 'font',
    ttf: 'font',
    eot: 'font',
    json: 'fetch',
    html: 'document',
    txt: 'fetch'
  };
  
  /**
   * 智能推断资源类型
   * @param {string} url 资源URL
   * @returns {string} preload类型
   */
  function inferResourceType(url) {
    // 提取纯净的扩展名（去除查询参数和哈希）
    const extension = url.split('.').pop()
      .toLowerCase()
      .split(/[?#]/)[0];
    
    return RESOURCE_TYPES[extension] || 'fetch';
  }
  
  /**
   * 预加载单个资源
   * @param {string} url 资源URL
   * @returns {Promise<void>} 加载Promise
   */
  function preloadSingle(url) {
    return new Promise((resolve) => {
      const type = inferResourceType(url);
      const link = document.createElement('link');
      
      link.rel = 'preload';
      link.href = url;
      link.as = type;
      
      // 字体资源必须设置crossorigin
      if (type === 'font') {
        link.crossOrigin = 'anonymous';
      }
  
      link.onload = () => {
        console.debug(`[Preload] 成功加载: ${url}`);
        resolve();
      };
      
      link.onerror = (err) => {
        console.warn(`[Preload] 加载失败: ${url}`, err);
        resolve(); // 单个资源失败不阻断流程
      };
  
      document.head.appendChild(link);
    });
  }
  
  /**
   * 带并发控制的批量预加载
   * @param {string[]} resources 资源URL数组
   * @param {number} [concurrency=3] 并发数
   * @returns {Promise<void>}
   */
  async function preloadWithPriority(resources, concurrency = 3) {
    const queue = [...resources];
    let activeCount = 0;
    const promises = [];
  
    return new Promise((resolve) => {
      function processNext() {
        // 队列完成且无活跃任务时结束
        if (queue.length === 0 && activeCount === 0) {
          Promise.all(promises).then(resolve);
          return;
        }
  
        // 填充并发槽
        while (queue.length > 0 && activeCount < concurrency) {
          const url = queue.shift();
          activeCount++;
          
          const promise = preloadSingle(url)
            .finally(() => {
              activeCount--;
              processNext();
            });
          
          promises.push(promise);
        }
      }
  
      processNext();
    });
  }
  
  /**
   * 主预加载函数
   * @param {string[][]} [customConfig] 自定义配置（可选）
   * @returns {Promise<void>}
   */
  export async function preloadResources(customConfig = DEFAULT_PRELOAD_CONFIG) {
    // 兼容性检查
    if (!('requestIdleCallback' in window)) {
      console.warn('[Preload] 浏览器不支持requestIdleCallback');
      return;
    }
  
    try {
      // 等待页面主内容加载完成
      if (document.readyState !== 'complete') {
        await new Promise(resolve => 
          window.addEventListener('load', resolve, { once: true }));
      }
  
      // 等待浏览器空闲时段（超时3秒保底）
      await new Promise(resolve => 
        requestIdleCallback(resolve, { timeout: 3000 }));
  
      console.log('[Preload] 开始预加载资源');
      
      // 按优先级顺序加载资源组
      for (const resourceGroup of customConfig) {
        await preloadWithPriority(resourceGroup, 2); // 每组并发2个
      }
  
      console.log('[Preload] 所有资源预加载完成');
    } catch (err) {
      console.error('[Preload] 预加载流程异常:', err);
    }
  }
