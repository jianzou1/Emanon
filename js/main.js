// main.js

// ========== 导入模块 ==========
import { loadResources } from '/js/cdnLoader.js'; // CDN 加载器
import { TabHandler } from '/js/tabHandler.js';
import { updateProgressBar } from '/js/progressBar.js';
import { loadPreviewLinks } from '/js/previewLoader.js';
import { footerLoader } from '/js/footerLoader.js';
import { handleScrollAndScrollToTop } from '/js/scrollToTop.js';
import { initializeDailyPopup } from '/js/dailyPopup.js';
import { initializeTips } from '/js/tips.js';
import {
  initializeLoadingAnimation,
  showLoadingAnimation,
  hideLoadingAnimation
} from '/js/loadingAnimation.js';
import { gameList } from '/js/gameList.js';
import { initializeGallery } from '/js/gallery.js';
import { initCRT } from '/js/crtEffect.js';

// ========== 主初始化逻辑 ==========
const initializeApp = async () => {
  try {
    // 1. 加载 CDN 资源（CSS 和 PJAX）
    const { Pjax } = await loadResources();

    // 2. 初始化 PJAX 实例
    const pjax = new Pjax({
      selectors: ['head title', '#main'],
      cacheBust: false
    });

    // 3. 定义标签导航数据
    const tabData = [
      { url: '/', text: 'Progress' },
      { url: '/page/article.html', text: 'Article' },
      { url: '/page/game.html', text: 'Game List' },
      { url: '/page/gallery.html', text: 'Gallery' },
      { url: '/page/about.html', text: 'About Me' }
    ];

    // 4. 创建标签导航处理器
    const tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);

    // 5. 加载动画控制函数
    const toggleLoadingAnimation = (isLoading) => {
      if (isLoading) {
        initializeLoadingAnimation().then(showLoadingAnimation);
      } else {
        hideLoadingAnimation();
      }
    };

    // 6. PJAX 事件监听
    document.addEventListener('pjax:send', () => toggleLoadingAnimation(true));
    
    document.addEventListener('pjax:complete', () => {
      console.log('PJAX 完成，页面已更新');
      toggleLoadingAnimation(false);
      handlePageLoad();
    });

    // 7. 页面加载处理函数
    const handlePageLoad = () => {
      try {
        const currentUrl = window.location.pathname;
        
        // 根据 URL 执行不同初始化
        switch (currentUrl) {
          case '/':
            updateProgressBar();
            initializeDailyPopup();
            break;
          case '/page/article.html':
            loadPreviewLinks(pjax, tabHandler);
            break;
          case '/page/game.html':
            gameList();
            break;
          case '/page/gallery.html':
            initializeGallery();
            break;
          default:
            break;
        }

        // 通用初始化
        footerLoader();
        handleScrollAndScrollToTop();
        initializeTips();
        initCRT();

        // 更新标签导航状态
        const tablist = document.querySelector('[role="tablist"]');
        if (tablist) {
          tablist.innerHTML = '';
          new TabHandler('[role="tablist"]', tabData, pjax);
        }
      } catch (error) {
        console.error('页面加载过程中出错:', error);
      }
    };

    // 8. Logo 点击返回首页
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        e.preventDefault();
        pjax.loadUrl('/');
        tabHandler.updateSelectedTab('/');
      });
    }

    // 9. 初始页面加载
    handlePageLoad();

  } catch (error) {
    console.error('应用初始化失败:', error);
    // 可在此添加错误恢复逻辑（例如重试机制）
  }
};

// ========== 导出 initializeApp 函数 ==========
export { initializeApp };