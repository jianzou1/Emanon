// tabHandler.js

export class TabHandler {
    constructor(tabListSelector, tabData, pjaxInstance) {
        this.tabList = $(tabListSelector);
        this.tabData = tabData;
        this.pjax = pjaxInstance;

        if (this.tabList.length === 0) {
            console.error('Tab list element not found');
            return;
        }

        this.initTabs();
        this.updateSelectedTab(window.location.pathname);
    }

    // 初始化选项卡
    initTabs() {
        const tabElements = this.tabData.map(tab => `
            <li data-url="${tab.url}" role="tab">
                <a href="${tab.url}" data-pjax>${tab.text}</a>
            </li>
        `).join('');
        
        this.tabList.append(tabElements);
        this.tabList.on('click', '[role="tab"]', this.handleTabClick.bind(this));
    }

    // 处理选项卡点击事件
    async handleTabClick(event) {
        const clickedTab = $(event.currentTarget);
        const clickedTabUrl = clickedTab.data('url');

        // 检查是否需要加载新页面
        if (clickedTabUrl === window.location.pathname) {
            event.preventDefault(); // 阻止默认链接行为
            return; // 直接返回
        }

        this.updateSelectedTab(clickedTabUrl);
        this.pjax.loadUrl(clickedTabUrl); // 使用 PJAX 加载新 URL

        event.preventDefault(); // 阻止默认链接行为
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        this.tabList.find('[role="tab"]').each(function() {
            const tabUrl = $(this).data('url');
            const isActive = currentUrl === tabUrl;

            $(this).attr('aria-selected', isActive);
            $(this).toggleClass('active', isActive); // 添加或移除 active 类
        });
    }
}
