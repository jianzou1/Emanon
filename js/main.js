// main.js
import { loadResources } from '/js/cdnLoader.js';
import { TabHandler } from '/js/tabHandler.js';
import { updateProgressBar } from '/js/progressBar.js';
import { loadPreviewLinks } from '/js/previewLoader.js';
import { footerLoader } from '/js/footerLoader.js';
import { handleScrollAndScrollToTop } from '/js/scrollToTop.js';
import { initializeDailyPopup } from '/js/dailyPopup.js';
import { initializeTips } from '/js/tips.js';
import { gameList } from '/js/gameList.js';
import { initGameRoll } from '/js/gameRoll.js';
import { initializeGallery } from '/js/gallery.js';
import { initCRT } from '/js/crtEffect.js';
import { initializeRandomLogo } from '/js/logoRandomizer.js';
import langManager from '/js/langManager.js';

const initializeApp = async () => {
  try {
    // 初始化多语言管理器
    await langManager.init();
    
    // 初始化随机Logo（仅整页加载）
    initializeRandomLogo();

    // 加载PJAX依赖
    const { Pjax } = await loadResources();

    // 配置PJAX实例
    const pjax = new Pjax({
      selectors: ['head title', '#main'],
      cacheBust: false,
    });

    // 选项卡配置数据
    const tabData = [
      { url: '/', text: 'tab_progress' },
      { url: '/page/article.html', text: 'tab_article' },
      { url: '/page/game.html', text: 'tab_game' },
      { url: '/page/gallery.html', text: 'tab_gallery' },
      { url: '/page/about.html', text: 'tab_about' }
    ];

    // 初始化标签处理器
    const tabHandler = new TabHandler(
      '[role="tablist"]',
      tabData, 
      pjax
    );

    // PJAX事件监听
    document.addEventListener('pjax:complete', () => {
      handlePageLoad();
    });

    // 页面加载处理器
    const handlePageLoad = () => {
      try {
        const currentUrl = window.location.pathname;

        // 页面类型判断
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
            initGameRoll();
            break;
          case '/page/gallery.html':
            initializeGallery();
            break;
          default:
            break;
        }

        // 通用功能初始化
        footerLoader();
        handleScrollAndScrollToTop();
        initializeTips();
        initCRT();

        // 重新绑定选项卡（PJAX加载后）
        const tablist = document.querySelector('[role="tablist"]');
        if (tablist) {
          tablist.innerHTML = '';
          new TabHandler('[role="tablist"]', tabData, pjax);
        }
      } catch (error) {
        console.error('页面加载过程中出错:', error);
      }
    };

    // 初始页面加载
    handlePageLoad();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

// 启动应用

export { initializeApp };