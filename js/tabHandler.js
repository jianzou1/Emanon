// tabHandler.js
// SPA 化：页签内容缓存到内存，切换时 innerHTML 注入，跳过网络请求

export class TabHandler {
    static preloaded = false;    // 静态标志，防止重复预加载
    static htmlCache = new Map(); // URL → #main innerHTML 的内存缓存

    /**
     * @param {string}   tabListSelector
     * @param {Array}    tabData
     * @param {object}   pjaxInstance - 仅用于非页签页面的 fallback
     * @param {Function} onPageLoad   - main.js 提供的 handlePageLoad 回调
     */
    constructor(tabListSelector, tabData, pjaxInstance, onPageLoad) {
        this.tabList = document.querySelector(tabListSelector);
        this.tabData = tabData;
        this.pjax = pjaxInstance;
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

        // 缓存当前页 + 预加载其他页签
        this.cacheCurrentPage();
        this.preloadTabs();
    }

    // 缓存当前页面的 #main 内容
    cacheCurrentPage() {
        const currentUrl = window.location.pathname;
        if (!this.isTabUrl(currentUrl)) return;
        if (TabHandler.htmlCache.has(currentUrl)) return;

        const main = document.getElementById('main');
        if (main) {
            TabHandler.htmlCache.set(currentUrl, main.innerHTML);
        }
    }

    // 处理选项卡点击事件 — 优先从内存缓存切换
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

        const cached = TabHandler.htmlCache.get(clickedTabUrl);
        if (cached) {
            // ★ 内存缓存命中：直接注入，零网络请求
            const main = document.getElementById('main');
            if (main) main.innerHTML = cached;

            // 更新 URL（不触发页面刷新）
            history.pushState({ tabUrl: clickedTabUrl }, '', clickedTabUrl);

            // 触发页面初始化（复用现有分发逻辑）
            if (this.onPageLoad) this.onPageLoad();
        } else {
            // 缓存未命中：降级走 PJAX
            try {
                await this.pjax.loadUrl(clickedTabUrl);
            } catch (error) {
                console.error('页面加载失败:', clickedTabUrl, error);
            }
        }
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        if (!this.tabList) return;
        this.tabList.querySelectorAll('[role="tab"]').forEach(tab => {
            const tabUrl = tab.dataset.url;
            const isActive = currentUrl === tabUrl;

            tab.setAttribute('aria-selected', isActive);
            isActive ? tab.classList.add('active') : tab.classList.remove('active');
        });
    }

    // 预加载所有页签内容到内存缓存
    preloadTabs() {
        if (TabHandler.preloaded) return;
        TabHandler.preloaded = true;

        this.tabData.forEach(tab => {
            if (tab.url === window.location.pathname) return;  // 当前页已缓存
            if (TabHandler.htmlCache.has(tab.url)) return;     // 已有缓存

            fetch(tab.url, { method: 'GET' })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.text();
                })
                .then(html => {
                    // 从完整 HTML 中提取 #main 的内容
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const main = doc.getElementById('main');
                    if (main) {
                        TabHandler.htmlCache.set(tab.url, main.innerHTML);
                    }
                })
                .catch(error => {
                    console.warn('预加载失败:', tab.url, error);
                });
        });
    }
}