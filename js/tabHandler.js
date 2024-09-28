// tabHandler.js

export class TabHandler {
    constructor(tabListSelector, tabData, pjaxInstance) {
        this.tabList = document.querySelector(tabListSelector);
        this.tabData = tabData;
        this.pjax = pjaxInstance;

        if (!this.tabList) {
            console.error('Tab list element not found');
            return; // 如果元素不存在，停止执行
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

        this.tabList.innerHTML = tabElements;

        // 绑定选项卡点击事件
        this.tabList.addEventListener('click', this.handleTabClick.bind(this));
    }

    // 处理选项卡点击事件
    async handleTabClick(event) {
        const clickedTab = event.target.closest('[role="tab"]');
        if (!clickedTab) return;

        const clickedTabUrl = clickedTab.dataset.url;

        // 如果点击的标签已激活，直接返回
        if (clickedTabUrl === window.location.pathname) {
            event.preventDefault();
            return;
        }

        event.preventDefault(); // 阻止默认链接行为

        // 添加激活态类到 .window
        const windowElement = document.querySelector('.window');
        if (windowElement) {
            windowElement.classList.add('active'); // 激活窗口
        }

        this.updateSelectedTab(clickedTabUrl);

        try {
            await this.pjax.loadUrl(clickedTabUrl); // 使用 PJAX 加载新 URL
        } catch (error) {
            console.error('Error loading URL:', error);
            // 可以在这里添加用户友好的提示，例如弹窗或通知
        } finally {
            if (windowElement) {
                setTimeout(() => {
                    windowElement.classList.remove('active'); // 从 .window 移除激活态
                }, 150); // 150 毫秒后移除激活态，以匹配动画持续时间
            }
        }
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        this.tabList.querySelectorAll('[role="tab"]').forEach(tab => {
            const tabUrl = tab.dataset.url;
            const isActive = currentUrl === tabUrl;

            tab.setAttribute('aria-selected', isActive);
            if (isActive) {
                tab.classList.add('active'); // 添加 active 类
            } else {
                tab.classList.remove('active'); // 移除 active 类
            }
        });
    }
}
