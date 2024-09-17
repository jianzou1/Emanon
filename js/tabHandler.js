// tabHandler.js

class TabHandler {
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
        this.tabData.forEach(tab => {
            const li = $(`
                <li data-url="${tab.url}" role="tab">
                    <a href="${tab.url}" data-pjax>${tab.text}</a>
                </li>
            `);
            this.tabList.append(li);
        });
        this.tabList.on('click', '[role="tab"]', this.handleTabClick.bind(this));
    }

    // 处理选项卡点击事件
    handleTabClick(event) {
        const clickedTab = $(event.currentTarget);
        const clickedTabUrl = clickedTab.data('url');

        if (clickedTabUrl !== window.location.pathname) {
            this.updateSelectedTab(clickedTabUrl);
            this.pjax.loadUrl(clickedTabUrl); // 使用 PJAX 加载新 URL
        }
        event.preventDefault(); // 阻止默认链接行为
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        this.tabList.find('[role="tab"]').each(function() {
            const tabUrl = $(this).data('url');
            const normalizedTabUrl = tabUrl === '/index.html' ? '/' : tabUrl;
            $(this).attr('aria-selected', currentUrl === normalizedTabUrl);
        });
    }
}

// 加载多个 JS 文件
function loadScripts(scripts, callback) {
    let index = 0;

    const loadNext = () => {
        if (index < scripts.length) {
            $.getScript(scripts[index++])
                .done(loadNext)
                .fail(() => {
                    console.error('Error loading script:', scripts[index - 1]);
                    loadNext(); // 继续加载下一个脚本
                });
        } else if (callback) {
            callback(); // 所有脚本均已加载完成
        }
    };

    loadNext(); // 开始加载第一个脚本
}

// 处理 PJAX 事件
function handlePjaxEvents(tabHandler) {
    $(document).on('pjax:send', () => console.log('PJAX: send'));

    $(document).on('pjax:complete', () => {
        console.log('PJAX: complete');
        tabHandler.updateSelectedTab(window.location.pathname);
        updateProgressBarIfAvailable();
        loadPreviewLinksIfAvailable(); // 在 PJAX 完成后调用预览链接更新
    });

    $(document).on('pjax:error', (event) => {
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
$(document).ready(() => {
    console.log('DOM fully loaded and parsed');

    const scriptsToLoad = [
        '/js/progressBar.js',
        '/js/previewLoader.js',
    ];

    loadScripts(scriptsToLoad, () => {
        console.log('所有指定的 JS 文件已加载');
        initializeApp();
        updateProgressBarIfAvailable(); // 初次加载时更新进度条
        loadPreviewLinksIfAvailable(); // 初次加载时尝试更新预览链接
    });
});
