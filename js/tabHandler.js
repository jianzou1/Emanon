// tabHandler.js

class TabHandler {
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

    // 初始化选项卡
    initTabs() {
        this.tabData.forEach(tab => {
            const li = document.createElement('li');
            li.setAttribute('data-url', tab.url);
            li.setAttribute('role', 'tab');
            li.innerHTML = `<a href="${tab.url}" data-pjax>${tab.text}</a>`;
            this.tabList.appendChild(li);
        });
        this.tabList.addEventListener('click', this.handleTabClick.bind(this));
    }

    // 处理选项卡点击事件
    handleTabClick(event) {
        const clickedTab = event.target.closest('[role="tab"]');
        if (clickedTab) {
            event.preventDefault();
            const clickedTabUrl = clickedTab.getAttribute('data-url');
            if (clickedTabUrl !== window.location.pathname) {
                this.updateSelectedTab(clickedTabUrl);
                this.pjax.loadUrl(clickedTabUrl); // 使用 PJAX 加载新 URL
            }
        }
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        const tabs = this.tabList.querySelectorAll('[role="tab"]');
        tabs.forEach(tab => {
            const tabUrl = tab.getAttribute('data-url');
            const normalizedTabUrl = tabUrl === '/index.html' ? '/' : tabUrl;
            tab.setAttribute('aria-selected', currentUrl === normalizedTabUrl);
        });
    }
}

// 加载多个 JS 文件
function loadScripts(scripts, callback) {
    let index = 0;

    const loadNext = () => {
        if (index < scripts.length) {
            const script = document.createElement('script');
            script.src = scripts[index++];
            script.onload = loadNext;
            script.onerror = () => {
                console.error('Error loading script:', script.src);
                loadNext(); // 继续加载下一个脚本
            };
            document.head.appendChild(script);
        } else if (callback) {
            callback(); // 所有脚本均已加载完成
        }
    };

    loadNext(); // 开始加载第一个脚本
}

// 处理 PJAX 事件
function handlePjaxEvents(tabHandler) {
    document.addEventListener('pjax:send', () => console.log('PJAX: send'));

    document.addEventListener('pjax:complete', () => {
        console.log('PJAX: complete');
        tabHandler.updateSelectedTab(window.location.pathname);
        updateProgressBarIfAvailable();
        loadPreviewLinksIfAvailable();
    });

    document.addEventListener('pjax:error', (event) => {
        console.error('PJAX: 请求失败', event);
    });
}

// 检查并更新进度条
function updateProgressBarIfAvailable() {
    if (typeof updateProgressBar === 'function') {
        try {
            updateProgressBar();
        } catch (error) {
            console.error('Error updating progress bar:', error);
        }
    } else {
        console.error('updateProgressBar function not available.');
    }
}

// 检查并加载预览链接
function loadPreviewLinksIfAvailable() {
    if (typeof loadPreviewLinks === 'function') {
        try {
            loadPreviewLinks();
        } catch (error) {
            console.error('Error loading preview links:', error);
        }
    }
}

// 初始化 PJAX 和 TabHandler
function initializeApp() {
    const pjax = new Pjax({
        selectors: ['head title', '#main'],
        cacheBust: false
    });

    const tabData = [
        { url: '/', text: 'Time Progress' },
        { url: '/page/article.html', text: 'Article' },
        { url: '/page/game_design.html', text: 'Game Design' },
        { url: '/page/about.html', text: 'About Me' }
    ];

    const tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);
    handlePjaxEvents(tabHandler);
}

// 当文档加载完毕时，初始化脚本
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    const scriptsToLoad = [
        '/js/progressBar.js',
        '/js/previewLoader.js',
    ];

    loadScripts(scriptsToLoad, () => {
        console.log('所有指定的 JS 文件已加载');
        initializeApp();
        updateProgressBarIfAvailable(); // 初次加载时更新进度条
    });
});
