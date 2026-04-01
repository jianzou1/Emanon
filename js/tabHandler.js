// tabHandler.js
// SPA 化：页签内容缓存到内存，切换时只替换内容区域（保留 Tab 栏），零网络请求

export class TabHandler {
    static preloaded = false;    // 静态标志，防止重复预加载
    static htmlCache = new Map(); // URL → { inner, outer } 内存缓存（不含 tablist）
    //   inner: .window-body 内 tablist 之后的兄弟节点 HTML
    //   outer: .window-body 之后的 #main 直接子元素 HTML（如 gallery 的 #imageModal）

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
            // ★ 内存缓存命中：细粒度替换，保留 Tab 栏不变
            const main = document.getElementById('main');
            if (main) TabHandler.replaceContent(main, cached);

            // 更新 URL（不触发页面刷新）
            history.pushState({ tabUrl: clickedTabUrl }, '', clickedTabUrl);

            // 触发页面初始化（传入 isTabSwitch 标识走快速路径）
            if (this.onPageLoad) this.onPageLoad(true);
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
        // 非页签 URL（如文章详情页）不改变当前选中状态
        if (!this.isTabUrl(currentUrl)) return;
        this.tabList.querySelectorAll('[role="tab"]').forEach(tab => {
            const tabUrl = tab.dataset.url;
            const isActive = currentUrl === tabUrl;

            tab.setAttribute('aria-selected', isActive);
            isActive ? tab.classList.add('active') : tab.classList.remove('active');
        });
    }

    // 预加载所有页签内容到内存缓存（只缓存内容区域）
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
                    // 从完整 HTML 中提取 #main 的内容区域（不含 tablist）
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const main = doc.getElementById('main');
                    if (main) {
                        const contentHtml = TabHandler.getContentHtml(main);
                        if (contentHtml) {
                            TabHandler.htmlCache.set(tab.url, contentHtml);
                        }
                    }
                })
                .catch(error => {
                    console.warn('预加载失败:', tab.url, error);
                });
        });
    }
}