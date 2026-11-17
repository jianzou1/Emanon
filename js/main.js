// main.js
import { loadPjax } from '/js/cdnLoader.js';
import { TabHandler } from '/js/tabHandler.js';
import { cleanupProgressBar } from '/js/progressBar.js';
import { footerLoader } from '/js/footerLoader.js';
import { initScrollToTop, cleanupScrollToTop } from '/js/scrollToTop.js';
import { initializeTips } from '/js/tips.js';
import { cleanupGallery } from '/js/gallery.js';
import { initCRT } from '/js/crtEffect.js';
import { initializeRandomLogo } from '/js/logoRandomizer.js';
import { prefetchMessages } from '/js/messageBoard.js';
import { showAboutPopup } from '/js/aboutPopup.js';
import langManager from '/js/langManager.js';
import { warmUpCache } from '/js/dataCache.js';
import { runPageModuleByUrl } from '/js/pageRegistry.js';
import { shouldSkipPrefetch, onIdle } from '/js/prefetch.js';

const TABLIST_SELECTOR = '[role="tablist"]';
const TAB_DATA = [
  { url: '/', text: 'tab_progress', titleId: 'index_title' },
  { url: '/page/article.html', text: 'tab_article', titleId: 'article_title' },
  { url: '/page/game.html', text: 'tab_game', titleId: 'game_title' },
  { url: '/page/gallery.html', text: 'tab_gallery', titleId: 'gallery_title' },
  { url: '/page/message.html', text: 'tab_message', titleId: 'message_title' },
  // { url: '/page/test.html', text: 'tab_test', titleId: 'test_title' },
];

// 防止 HMR / 重初始化时重复绑定全局事件监听器
let globalBindingsDone = false;
// gameRoll 返回的 cleanup 函数引用
let gameRollCleanup = null;
// baselineTest 返回的 cleanup 函数引用
let baselineCleanup = null;

// ── pjax 惰性单例 ──
// 首屏渲染完全不需要 pjax：页签切换走 TabHandler 的内存缓存，
// 只有文章详情页、密码页跳转、文章列表点击才用得上。
// 因此把它从首屏关键路径上摘掉，改为首次真正需要时再加载，
// 空闲时段（见文件末尾）会顺手把它热身好。
let pjaxInstance = null;
let pjaxLoading = null;

const getPjax = () => {
  if (pjaxInstance) return Promise.resolve(pjaxInstance);
  if (!pjaxLoading) {
    pjaxLoading = loadPjax()
      .then(Pjax => {
        if (typeof Pjax !== 'function') {
          throw new Error('Pjax 未正确挂载到 window');
        }
        pjaxInstance = new Pjax({
          selectors: ['head title', '#main'],
          cacheBust: false,
        });
        return pjaxInstance;
      })
      .catch(error => {
        pjaxLoading = null; // 失败后允许下次重试
        throw error;
      });
  }
  return pjaxLoading;
};

const bindGlobalPjaxNavigation = (getTabHandler) => {
  /**
   * 用 pjax 导航到目标地址。
   * preventDefault 必须同步执行（否则浏览器默认跳转已经开始），
   * 之后才 await pjax 加载；加载失败则回退整页跳转，保证链接不会点了没反应。
   */
  const navigateByPjax = async (url, event) => {
    const targetUrl = new URL(url, window.location.origin);

    if (targetUrl.origin !== window.location.origin) {
      return;
    }

    if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
      return;
    }

    event.preventDefault();
    const target = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

    try {
      const pjax = await getPjax();
      pjax.loadUrl(target);
      getTabHandler()?.updateSelectedTab(targetUrl.pathname);
    } catch (error) {
      console.error('[Nav] pjax 加载失败，回退整页跳转:', error);
      window.location.href = targetUrl.href;
    }
  };

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    // ★ 优先拦截"关于"弹窗触发器
    const aboutTrigger = event.target.closest('[data-about-popup]');
    if (aboutTrigger) {
      event.preventDefault();
      showAboutPopup();
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

    let currentTabHandler = null;
    const getTabHandler = () => currentTabHandler;

    /**
     * 页面加载处理器（清理 + 初始化 + 通用功能）
     * @param {boolean} isTabSwitch - true: Tab 缓存切换走快速路径；false: PJAX/首次加载走完整路径
     */
    const handlePageLoad = (isTabSwitch = false) => {
      try {
        // 清理上一页的后台资源（定时器、Observer 等）
        cleanupProgressBar();
        cleanupGallery();
        cleanupScrollToTop();
        if (gameRollCleanup) {
          gameRollCleanup();
          gameRollCleanup = null;
        }
        if (baselineCleanup) {
          baselineCleanup();
          baselineCleanup = null;
        }

        const currentUrl = window.location.pathname;

        if (isTabSwitch) {
          // ★ Tab 缓存切换快速路径：Tab 栏已保留在 DOM 中，只需更新选中状态
          if (currentTabHandler) {
            currentTabHandler.updateSelectedTab(currentUrl);
          }
        } else {
          // PJAX / 首次加载完整路径：Tab 栏可能被替换，需要重建
          refreshTabHandler();
        }

        // 页面类型判断（通过注册表调度）
        runPageModuleByUrl(currentUrl, {
          getPjax,
          setGameRollCleanup: (cleanupFn) => {
            gameRollCleanup = typeof cleanupFn === 'function' ? cleanupFn : null;
          },
          setBaselineCleanup: (cleanupFn) => {
            baselineCleanup = typeof cleanupFn === 'function' ? cleanupFn : null;
          },
        });


        // 通用功能初始化
        footerLoader(isTabSwitch);
        initScrollToTop();
        initializeTips();

        if (isTabSwitch) {
          // ★ Tab 缓存切换：CRT 已是单例无需重调；翻译只扫描内容区域
          const main = document.getElementById('main');
          if (main) {
            langManager.applyTranslationsIn(main);
          }
        } else {
          // PJAX / 首次加载：完整初始化
          initCRT();
          langManager.applyTranslations();
        }
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
      currentTabHandler = new TabHandler(TABLIST_SELECTOR, TAB_DATA, handlePageLoad);
    };

    // 全局事件只绑定一次（防止 HMR 重初始化累积）
    if (!globalBindingsDone) {
      bindGlobalPjaxNavigation(getTabHandler);

      // PJAX 完成事件（文章详情页等非页签页面仍走 PJAX）
      document.addEventListener('pjax:complete', () => {
        handlePageLoad();
      });

      // 浏览器前进/后退：从内存缓存恢复页签内容
      // 注册到捕获阶段，先于 PJAX 的 popstate handler 执行
      window.addEventListener('popstate', (event) => {
        const url = window.location.pathname;
        const cached = TabHandler.htmlCache.get(url);
        if (cached) {
          // 阻止 PJAX 的 popstate 处理器执行，避免异步请求覆盖已恢复的缓存内容
          event.stopImmediatePropagation();

          // 更新页面标题
          if (currentTabHandler) currentTabHandler.updateTitle(url);

          const main = document.getElementById('main');
          if (main) {
            const replaced = TabHandler.replaceContent(main, cached);
            if (replaced) {
              // tablist 保留在 DOM 中，内容已替换 → 快速路径
              handlePageLoad(true);
            } else {
              // 当前 DOM 没有 tablist（从非页签页后退）→ 完整重建
              main.innerHTML = '<div class="window-body"><menu role="tablist"></menu>' + cached.inner + '</div>' + (cached.outer || '');
              handlePageLoad(false);
            }
          }
          return;
        }

        // 非页签页面：pjax 已就绪时交给它自己的 popstate 处理器。
        // pjax 尚未加载时它没有任何处理器，需要在这里主动接管这次前进/后退，
        // 否则 URL 变了而 DOM 没变。
        if (!pjaxInstance) {
          getPjax()
            .then(pjax => pjax.loadUrl(`${url}${window.location.search}`))
            .catch(() => window.location.reload());
        }
      }, true); // ← 捕获阶段

      globalBindingsDone = true;
    }

    // 初始页面加载
    handlePageLoad();

    // 静默预取留言板第 1 页数据（后台请求，不阻塞页面）
    prefetchMessages();

    // 非关键预取：空闲时先把 pjax 热身好（文章详情页需要），
    // 再预热其余几个配置 JSON。省流模式或 2G 级网络下整体跳过。
    // 链式执行而非并发，避免两批请求同时抢带宽。
    if (!shouldSkipPrefetch()) {
      onIdle(() => {
        getPjax()
          .catch(() => {})
          .then(() => {
            warmUpCache([
              '/cfg/article_cfg.json',
              '/cfg/game_time_cfg.json',
              '/cfg/system_cfg.json',
              '/cfg/gallery_cfg.json',
            ]);
          });
      }, { timeout: 5000, fallbackDelay: 2000 });
    }
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

// 实际启动入口在 index.js（HMR 友好），此处仅导出
export { initializeApp };
