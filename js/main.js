// main.js

import { TabHandler } from '/js/tabHandler.js'; // 使用绝对路径导入 TabHandler
import { updateProgressBar } from '/js/progressBar.js'; // 导入进度条功能
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

    let tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);

    function handlePageLoad() {
        try {
            const currentUrl = window.location.pathname;
            switch (currentUrl) {
                case '/':
                    console.log('Home page loaded.');
                    updateProgressBar();
                    initializeDailyPopup();
                    break;
                case '/page/article.html':
                    console.log('Article page loaded.');
                    loadPreviewLinks();
                    break;
            }

            footerLoader();
            handleScrollAndScrollToTop();
            $('[role="tablist"]').empty();
            tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);
            
            $(document).on('click', '.link-preview a', function(event) {
                event.preventDefault();
                const newUrl = $(this).attr('href');
                console.log(`Loading URL: ${newUrl}`);
                pjax.loadUrl(newUrl);
                tabHandler.updateSelectedTab(newUrl);
            });

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
});

