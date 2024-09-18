// main.js

import { TabHandler } from '/js/tabHandler.js'; // 使用绝对路径导入 TabHandler
import { updateProgressBar} from '/js/progressBar.js'; // 导入进度条功能
import { loadPreviewLinks } from '/js/previewLoader.js';
import { footerLoader } from '/js/footerLoader.js';
import { handleScrollAndScrollToTop } from '/js/scrollToTop.js';
import { initializeDailyPopup } from '/js/dailyPopup.js';

$(document).ready(() => {
    console.log('DOM fully loaded and parsed');

    // 初始化 PJAX
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

    // 创建 TabHandler 实例
    const tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);

    // 准备函数的调用逻辑
    function handlePageLoad() {
        try {
            const currentUrl = window.location.pathname; // 获取当前路径

            // 根据 currentUrl 调用对应的函数
            switch (currentUrl) {
                case '/':
                    console.log('Home page loaded.');
                    updateProgressBar(); // 初始化进度条
                    initializeDailyPopup(); // 每日弹窗
                    break;
                case '/page/article.html':
                    console.log('Article page loaded.');
                    loadPreviewLinks(); // 加载文章预览
                    break;
            }

            footerLoader(); // 加载页脚
            handleScrollAndScrollToTop(); // 回到顶部
        } catch (error) {
            console.error('Error during page load:', error); // 错误处理
        }
    }

    // 处理 PJAX 完成事件
    $(document).on('pjax:complete', handlePageLoad); // PJAX 完成后调用相应函数

    // LOGO互动事件处理
    $('.logo').on('click', () => {
        const newUrl = '/'; // 要加载的新 URL
        pjax.loadUrl(newUrl); // 使用 PJAX 加载主页
        tabHandler.updateSelectedTab(newUrl); // 更新选项卡的激活状态
    });

    // 初始页面加载时调用
    handlePageLoad();
});
