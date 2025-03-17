import { loadResources } from '/js/cdnLoader.js';
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
import { initGameRoll } from '/js/gameRoll.js';
import { initializeGallery } from '/js/gallery.js';
import { initCRT } from '/js/crtEffect.js';

const initializeApp = async () => {
  try {
    const { Pjax } = await loadResources();

    const pjax = new Pjax({
      selectors: ['head title', '#main'],
      cacheBust: false,
    });

    const tabData = [
      { url: '/', text: 'Progress' },
      { url: '/page/article.html', text: 'Article' },
      { url: '/page/game.html', text: 'Game List' },
      { url: '/page/gallery.html', text: 'Gallery' },
      { url: '/page/about.html', text: 'About Me' }
    ];

    const tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);

    const toggleLoadingAnimation = (isLoading) => {
      if (isLoading) {
        initializeLoadingAnimation().then(showLoadingAnimation);
      } else {
        hideLoadingAnimation();
      }
    };

    document.addEventListener('pjax:send', () => toggleLoadingAnimation(true));

    document.addEventListener('pjax:complete', () => {
      console.log('PJAX 完成，页面已更新');
      toggleLoadingAnimation(false);
      handlePageLoad();
    });

    const handlePageLoad = () => {
      try {
        const currentUrl = window.location.pathname;

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
            initGameRoll(); // 确保在 /page/game.html 下调用
            break;
          case '/page/gallery.html':
            initializeGallery();
            break;
          default:
            break;
        }

        footerLoader();
        handleScrollAndScrollToTop();
        initializeTips();
        initCRT();

        const tablist = document.querySelector('[role="tablist"]');
        if (tablist) {
          tablist.innerHTML = '';
          new TabHandler('[role="tablist"]', tabData, pjax);
        }
      } catch (error) {
        console.error('页面加载过程中出错:', error);
      }
    };

    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        e.preventDefault();
        pjax.loadUrl('/');
        tabHandler.updateSelectedTab('/');
      });
    }

    handlePageLoad();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

export { initializeApp };