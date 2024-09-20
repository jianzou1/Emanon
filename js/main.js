// main.js

import { TabHandler } from '/js/tabHandler.js'; // 使用绝对路径导入 TabHandler
import { updateProgressBar } from '/js/progressBar.js'; // 导入进度条功能
import { loadPreviewLinks } from '/js/previewLoader.js';
import { footerLoader } from '/js/footerLoader.js';
import { handleScrollAndScrollToTop } from '/js/scrollToTop.js';
import { initializeDailyPopup } from '/js/dailyPopup.js';
import { initializeTips } from '/js/tips.js';

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
        { url: '/page/about.html', text: 'About Me' }
    ];

    let tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);

    function handlePageLoad() {
        try {
            const currentUrl = window.location.pathname;
            switch (currentUrl) {
                case '/':
                    updateProgressBar();
                    initializeDailyPopup();
                    break;
                case '/page/article.html':
                    loadPreviewLinks(); // 传入 pjax 实例
                    break;
            }

            footerLoader();
            handleScrollAndScrollToTop();
            initializeTips();
            $('[role="tablist"]').empty();
            tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);
        } catch (error) {
            console.error('Error during page load:', error);
        }
    }

    // 处理 PJAX 完成事件
    $(document).on('pjax:complete', () => {
        console.log('PJAX 完成，页面已加载');
        handlePageLoad();
    });

    // LOGO互动事件处理
    $('.logo').on('click', () => {
        const newUrl = '/'; 
        pjax.loadUrl(newUrl);
        tabHandler.updateSelectedTab(newUrl);
    });

    // 初始页面加载时调用
    handlePageLoad();

    // 处理图标容器的点击事件以使用 PJAX
    $(document).on('click', '.link-container', function(event) {
        event.preventDefault(); // 防止默认行为
        const newUrl = $(this).data('url'); // 获取 URL
        
        if (newUrl) {
            pjax.loadUrl(newUrl); // 使用 PJAX 加载新页面
            tabHandler.updateSelectedTab(newUrl); // 更新选中标签
        } else {
            console.error('No URL found for this link container');
        }
    });
});
