// tabHandler.js
// SPA 化：页签内容缓存到内存，切换时只替换内容区域（保留 Tab 栏），零网络请求
import langManager from '/js/langManager.js';
import { shouldSkipPrefetch, onIdle } from '/js/prefetch.js';

export class TabHandler {
    static preloaded = false;    // 静态标志，防止重复预加载
    static htmlCache = new Map(); // URL → { inner, outer } 内存缓存（不含 tablist）
    //   inner: .window-body 内 tablist 之后的兄弟节点 HTML
    //   outer: .window-body 之后的 #main 直接子元素 HTML（如 gallery 的 #imageModal）

    /**
     * @param {string}   tabListSelector
     * @param {Array}    tabData
     * @param {Function} onPageLoad   - main.js 提供的 handlePageLoad 回调
     */
    constructor(tabListSelector, tabData, onPageLoad) {
        this.tabList = document.querySelector(tabListSelector);
        this.tabData = tabData;
        this.onPageLoad = onPageLoad;

        if (!this.tabList) {
            console.error('Tab list element not found');
            return;
        }

        this.initTabs();
        this.updateSelectedTab(window.location.pathname);
    }

    // 判断某个 URL 是否属于页签
    isTabUrl(url) {
        return this.tabData.some(tab => tab.url === url);
    }

    // 初始化选项卡
    initTabs() {
        const tabElements = this.tabData.map(tab => `
            <li data-url="${tab.url}" role="tab">
                <a href="${tab.url}" 
                   data-pjax 
                   data-lang-id="${tab.text}"
                   data-lang-params="[]"></a>
            </li>
        `).join('');

        this.tabList.innerHTML = tabElements;
        this.tabList.addEventListener('click', this.handleTabClick.bind(this));

        // 缓存当前页 + 排期预加载其他页签
        this.cacheCurrentPage();
        this.schedulePreload();
    }

    /**
     * 从 #main 中提取需要缓存的内容 HTML（不含 tablist）。
     * 返回结构化对象，分别存储两层内容：
     *   inner: .window-body 内 tablist 之后的兄弟节点（如 .window[role="tabpanel"]）
     *   outer: .window-body 之后的 #main 直接子元素（如 gallery 的 #imageModal）
     * @param {Element} mainEl - #main 元素
     * @returns {{ inner: string, outer: string }|null}
     */
    static getContentHtml(mainEl) {
        const windowBody = mainEl.querySelector('.window-body');
        if (!windowBody) return null;
        const tablist = windowBody.querySelector('menu[role="tablist"]');
        if (!tablist) return null;

        let inner = '';
        let sibling = tablist.nextElementSibling;
        while (sibling) {
            inner += sibling.outerHTML;
            sibling = sibling.nextElementSibling;
        }

        let outer = '';
        sibling = windowBody.nextElementSibling;
        while (sibling) {
            outer += sibling.outerHTML;
            sibling = sibling.nextElementSibling;
        }

        return { inner, outer };
    }

    /**
     * 替换 #main 中的内容区域，保留 .window-body 和 tablist 不变。
     * @param {Element} mainEl  - #main 元素
     * @param {{ inner: string, outer: string }} content - getContentHtml 返回的结构化对象
     * @returns {Element|null} 替换后的第一个内容元素（用于增量翻译范围限定）
     */
    static replaceContent(mainEl, content) {
        const windowBody = mainEl.querySelector('.window-body');
        if (!windowBody) return null;
        const tablist = windowBody.querySelector('menu[role="tablist"]');
        if (!tablist) return null;

        // 移除 .window-body 内 tablist 之后的所有兄弟节点
        while (tablist.nextElementSibling) {
            tablist.nextElementSibling.remove();
        }
        // 移除 .window-body 之后的 #main 直接子元素
        while (windowBody.nextElementSibling) {
            windowBody.nextElementSibling.remove();
        }

        // 注入 inner 内容到 .window-body（tablist 之后）
        if (content.inner) {
            tablist.insertAdjacentHTML('afterend', content.inner);
        }
        // 注入 outer 内容到 #main（.window-body 之后）
        if (content.outer) {
            windowBody.insertAdjacentHTML('afterend', content.outer);
        }

        return tablist.nextElementSibling;
    }

    /**
     * 抓取单个页签的 HTML 并解析出内容区域写入缓存。
     * 供缓存未命中时补取（例如用户抢在空闲预取之前点击）。
     * @param {string} url
     * @returns {Promise<{inner: string, outer: string}|null>}
     */
    async fetchTabContent(url) {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const main = doc.getElementById('main');
        const contentHtml = main ? TabHandler.getContentHtml(main) : null;
        if (contentHtml) {
            TabHandler.htmlCache.set(url, contentHtml);
        }
        return contentHtml;
    }

    // 缓存当前页面的内容区域（不含 tablist）
    cacheCurrentPage() {
        const currentUrl = window.location.pathname;
        if (!this.isTabUrl(currentUrl)) return;
        if (TabHandler.htmlCache.has(currentUrl)) return;

        const main = document.getElementById('main');
        if (main) {
            const contentHtml = TabHandler.getContentHtml(main);
            if (contentHtml) {
                TabHandler.htmlCache.set(currentUrl, contentHtml);
            }
        }
    }

    /**
     * 处理选项卡点击事件 — 优先从内存缓存切换。
     * 缓存未命中时只补取这一个页面的内容，不再降级到 pjax，
     * 因此页签切换完全不依赖 pjax 是否已加载。
     */
    async handleTabClick(event) {
        const clickedTab = event.target.closest('[role="tab"]');
        if (!clickedTab) return;

        const clickedTabUrl = clickedTab.dataset.url;

        // 点击当前页签，忽略
        if (clickedTabUrl === window.location.pathname) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        this.updateSelectedTab(clickedTabUrl);

        let cached = TabHandler.htmlCache.get(clickedTabUrl);

        if (!cached) {
            // ★ 缓存未命中：补取这一个页面（与预取走同一条解析逻辑）
            try {
                cached = await this.fetchTabContent(clickedTabUrl);
            } catch (error) {
                console.warn('[Tab] 页签内容获取失败，回退整页跳转:', error);
                window.location.href = clickedTabUrl;
                return;
            }
        }

        const main = document.getElementById('main');
        if (!main || !cached) {
            window.location.href = clickedTabUrl;
            return;
        }

        // ★ 细粒度替换，保留 Tab 栏不变
        TabHandler.replaceContent(main, cached);

        // 更新页面标题
        this.updateTitle(clickedTabUrl);

        // 更新 URL（不触发页面刷新）
        history.pushState({ tabUrl: clickedTabUrl }, '', clickedTabUrl);

        // 触发页面初始化（传入 isTabSwitch 标识走快速路径）
        if (this.onPageLoad) this.onPageLoad(true);
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        if (!this.tabList) return;
        // 非页签 URL（如文章详情页）不改变当前选中状态
        if (!this.isTabUrl(currentUrl)) return;
        this.tabList.querySelectorAll('[role="tab"]').forEach(tab => {
            const tabUrl = tab.dataset.url;
            const isActive = currentUrl === tabUrl;

            tab.setAttribute('aria-selected', isActive);
            isActive ? tab.classList.add('active') : tab.classList.remove('active');
        });
    }

    // 更新页面标题（Tab 缓存切换时调用，PJAX 路径由 head title 替换自动处理）
    updateTitle(url) {
        const tab = this.tabData.find(t => t.url === url);
        if (tab?.titleId) {
            // 更新 <title> 的 data-lang-id，确保 MutationObserver 翻译时也指向正确标题
            const titleEl = document.querySelector('head title');
            if (titleEl) {
                titleEl.setAttribute('data-lang-id', tab.titleId);
            }
            document.title = langManager.translate(tab.titleId);
        }
    }

    /**
     * 排期预加载：
     * 早期版本在 initTabs() 里同步发起 4 个 fetch，与首屏渲染抢带宽。
     * 现在改为空闲时段执行，并在用户省流 / 2G 网络下直接放弃。
     */
    schedulePreload() {
        if (TabHandler.preloaded) return;
        TabHandler.preloaded = true;

        if (shouldSkipPrefetch()) return;

        onIdle(() => this.preloadTabs(), { timeout: 2500, fallbackDelay: 1200 });
    }

    // 预加载所有页签内容到内存缓存（只缓存内容区域）
    preloadTabs() {
        this.tabData.forEach(tab => {
            if (tab.url === window.location.pathname) return;  // 当前页已缓存
            if (TabHandler.htmlCache.has(tab.url)) return;     // 已有缓存

            this.fetchTabContent(tab.url).catch(error => {
                console.warn('预加载失败:', tab.url, error);
            });
        });
    }
}
