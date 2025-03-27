// tabHandler.js
export class TabHandler {
    constructor(tabListSelector, tabData, pjaxInstance) {
        this.tabList = document.querySelector(tabListSelector);
        this.tabData = tabData;
        this.pjax = pjaxInstance;

        if (!this.tabList) {
            console.error('Tab list element not found');
            return;
        }

        this.initTabs();
        this.updateSelectedTab(window.location.pathname);
    }

    // 初始化选项卡（核心修改点）
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
    }

    // 处理选项卡点击事件
    async handleTabClick(event) {
        const clickedTab = event.target.closest('[role="tab"]');
        if (!clickedTab) return;

        const clickedTabUrl = clickedTab.dataset.url;

        if (clickedTabUrl === window.location.pathname) {
            event.preventDefault();
            return;
        }

        event.preventDefault();

        const windowElement = document.querySelector('.window');
        if (windowElement) {
            windowElement.classList.add('active');
        }

        this.updateSelectedTab(clickedTabUrl);

        try {
            await this.pjax.loadUrl(clickedTabUrl);
        } catch (error) {
            console.error('Error loading URL:', error);
        } finally {
            if (windowElement) {
                setTimeout(() => {
                    windowElement.classList.remove('active');
                }, 150);
            }
        }
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        this.tabList.querySelectorAll('[role="tab"]').forEach(tab => {
            const tabUrl = tab.dataset.url;
            const isActive = currentUrl === tabUrl;

            tab.setAttribute('aria-selected', isActive);
            isActive ? tab.classList.add('active') : tab.classList.remove('active');
        });
    }
}