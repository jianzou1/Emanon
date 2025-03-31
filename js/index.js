import { initializeApp } from './main.js';
import '../css/style.css';

// 初始化应用
let appInstance = initializeApp();

// ================= HMR 配置 =================
if (module.hot) {
  // 监听 JS 模块更新
  module.hot.accept('./main.js', () => {
    console.log('[HMR] 检测到 main.js 更新');
    
    try {
      // 销毁旧实例（假设 main.js 没有暴露 destroy 方法）
      const appRoot = document.getElementById('app');
      appRoot.innerHTML = '';
      
      // 重新初始化应用
      appInstance = initializeApp();
    } catch (error) {
      console.error('[HMR] 热更新失败:', error);
      window.location.reload();
    }
  });

  // 监听 CSS 更新（需确保开发环境使用 style-loader）
  module.hot.accept('../css/style.css', () => {
    console.log('[HMR] CSS 已更新');
  });
}