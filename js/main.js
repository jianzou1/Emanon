// main.js
import { loadResources } from '/js/cdnLoader.js';
import { TabHandler } from '/js/tabHandler.js';
import { updateProgressBar, cleanupProgressBar } from '/js/progressBar.js';
import { loadPreviewLinks } from '/js/previewLoader.js';
import { footerLoader } from '/js/footerLoader.js';
import { handleScrollAndScrollToTop } from '/js/scrollToTop.js';
import { initializeDailyPopup } from '/js/dailyPopup.js';
import { initializeTips } from '/js/tips.js';
import { gameList } from '/js/gameList.js';
import { initGameRoll } from '/js/gameRoll.js';
import { initializeGallery, cleanupGallery } from '/js/gallery.js';
import { initCRT } from '/js/crtEffect.js';
import { initializeRandomLogo } from '/js/logoRandomizer.js';
import { initializePassword } from '/js/password.js';
import { initializeMessageBoard } from '/js/messageBoard.js';
import langManager from '/js/langManager.js';

const TABLIST_SELECTOR = '[role="tablist"]';
const TAB_DATA = [
  { url: '/', text: 'tab_progress' },
  { url: '/page/article.html', text: 'tab_article' },
  { url: '/page/game.html', text: 'tab_game' },
  { url: '/page/gallery.html', text: 'tab_gallery' },
  { url: '/page/message.html', text: 'tab_message' },
];

// 防止 HMR / 重初始化时重复绑定全局事件监听器
let globalBindingsDone = false;
// 标志位：当 popstate 由内存缓存处理时，跳过后续 pjax:complete 的重复处理
let skipNextPjaxComplete = false;

const bindGlobalPjaxNavigation = (pjax, getTabHandler) => {
  const navigateByPjax = (url, event) => {
    const targetUrl = new URL(url, window.location.origin);

    if (targetUrl.origin !== window.location.origin) {
      return;
    }

    if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
      return;
    }

    event.preventDefault();
    pjax.loadUrl(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
    getTabHandler()?.updateSelectedTab(targetUrl.pathname);
  };

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const pjaxTrigger = event.target.closest('[data-pjax-url]');
    if (pjaxTrigger && !pjaxTrigger.closest(TABLIST_SELECTOR)) {
      if (pjaxTrigger.hasAttribute('data-no-pjax')) {
        return;
      }

      const pjaxUrl = pjaxTrigger.getAttribute('data-pjax-url');
      if (!pjaxUrl) {
        return;
      }

      navigateByPjax(pjaxUrl, event);
      return;
    }

    const link = event.target.closest('a[href]');
    if (!link) {
      return;
    }

    if (link.closest(TABLIST_SELECTOR)) {
      return;
    }

    if (link.hasAttribute('download') || link.getAttribute('target') === '_blank' || link.hasAttribute('data-no-pjax')) {
      return;
    }

    const rawHref = link.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      return;
    }

    navigateByPjax(link.href, event);
  });
};

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

    let currentTabHandler = null;
    const getTabHandler = () => currentTabHandler;

    // 页面加载处理器（清理 + 初始化 + 通用功能）
    const handlePageLoad = () => {
      try {
        // 清理上一页的后台资源（定时器、Observer 等）
        cleanupProgressBar();
        cleanupGallery();

        const currentUrl = window.location.pathname;

        refreshTabHandler();

        // 页面类型判断
        switch (currentUrl) {
          case '/':
            updateProgressBar();
            initializeDailyPopup();
            break;
          case '/page/article.html':
            loadPreviewLinks(pjax, currentTabHandler);
            break;
          case '/page/game.html':
            gameList();
            initGameRoll();
            break;
          case '/page/gallery.html':
            initializeGallery();
            break;
          case '/page/password.html':
            initializePassword(pjax);
            break;
          case '/page/message.html':
            initializeMessageBoard();
            break;
          default:
            break;
        }

        // 通用功能初始化
        footerLoader();
        handleScrollAndScrollToTop();
        initializeTips();
        initCRT();

        // 确保多语言翻译应用到新内容
        langManager.applyTranslations();
      } catch (error) {
        console.error('页面加载过程中出错:', error);
      }
    };

    const refreshTabHandler = () => {
      const tablist = document.querySelector(TABLIST_SELECTOR);
      if (!tablist) {
        currentTabHandler = null;
        return;
      }

      tablist.innerHTML = '';
      currentTabHandler = new TabHandler(TABLIST_SELECTOR, TAB_DATA, pjax, handlePageLoad);
    };

    // 全局事件只绑定一次（防止 HMR 重初始化累积）
    if (!globalBindingsDone) {
      bindGlobalPjaxNavigation(pjax, getTabHandler);

      // PJAX 完成事件（文章详情页等非页签页面仍走 PJAX）
      document.addEventListener('pjax:complete', () => {
        // 如果是内存缓存处理的 popstate，跳过 PJAX 的重复处理
        if (skipNextPjaxComplete) {
          skipNextPjaxComplete = false;
          return;
        }
        handlePageLoad();
      });

      // 浏览器前进/后退：从内存缓存恢复页签内容
      // 注册到捕获阶段，先于 PJAX 的 popstate handler 执行
      window.addEventListener('popstate', (event) => {
        const url = window.location.pathname;
        const cached = TabHandler.htmlCache.get(url);
        if (cached) {
          const main = document.getElementById('main');
          if (main) main.innerHTML = cached;
          // 标记：下一次 pjax:complete 跳过（PJAX 可能仍会触发自己的 popstate 处理）
          skipNextPjaxComplete = true;
          handlePageLoad();
        }
        // 非页签页面：不干预，让 PJAX 正常处理 popstate
      }, true); // ← 捕获阶段

      globalBindingsDone = true;
    }

    // 初始页面加载
    handlePageLoad();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

// 启动应用

export { initializeApp };