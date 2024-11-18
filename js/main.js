// main.js

// 导入所需的模块
import { TabHandler } from '/js/tabHandler.js'; 
import { updateProgressBar } from '/js/progressBar.js'; 
import { loadPreviewLinks } from '/js/previewLoader.js';
import { footerLoader } from '/js/footerLoader.js';
import { handleScrollAndScrollToTop } from '/js/scrollToTop.js';
import { initializeDailyPopup } from '/js/dailyPopup.js';
import { initializeTips } from '/js/tips.js';
import { initializeLoadingAnimation, showLoadingAnimation, hideLoadingAnimation } from '/js/loadingAnimation.js';
import { gameList } from '/js/gameList.js';
import { initializeGallery } from '/js/gallery.js'; // 新增导入 gallery.js

// 当DOM完全加载后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // 初始化 PJAX 实例，配置选择器和缓存设置
    const pjax = new Pjax({
        selectors: ['head title', '#main'],
        cacheBust: false
    });

    // 定义标签数据，用于TabHandler
    const tabData = [
        { url: '/', text: 'Progress' },
        { url: '/page/article.html', text: 'Article' },
        { url: '/page/game.html', text: 'Game List' },
        { url: '/page/gallery.html', text: 'Gallery' },
        { url: '/page/about.html', text: 'About Me' }
    ];

    // 创建 TabHandler 实例
    const tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);
    
    // 切换加载动画的函数
    const toggleLoadingAnimation = (isLoading) => {
        if (isLoading) {
            initializeLoadingAnimation().then(showLoadingAnimation);
        } else {
            hideLoadingAnimation();
        }
    };

    // PJAX 发送请求时显示加载动画
    document.addEventListener('pjax:send', () => toggleLoadingAnimation(true));

    // PJAX 请求完成时处理
    document.addEventListener('pjax:complete', () => {
        console.log('PJAX 完成，页面已加载');
        toggleLoadingAnimation(false); // 隐藏加载动画
        handlePageLoad(); // 处理页面加载
    });

    // 处理页面加载的函数
    function handlePageLoad() {
        try {
            const currentUrl = window.location.pathname; // 获取当前URL
            if (currentUrl === '/') {
                updateProgressBar();
                initializeDailyPopup();
            } else if (currentUrl === '/page/article.html') {
                loadPreviewLinks(pjax, tabHandler);
            } else if (currentUrl === '/page/game.html') {
                gameList(); 
            } else if (currentUrl === '/page/gallery.html') { // 添加对 Gallery 页面的处理
                initializeGallery(); // 调用初始化画廊函数
            }

            footerLoader();
            handleScrollAndScrollToTop();
            initializeTips();

            const tablist = document.querySelector('[role="tablist"]'); 
            if (tablist) {
                tablist.innerHTML = '';
                new TabHandler('[role="tablist"]', tabData, pjax); 
            }
        } catch (error) {
            console.error('Error during page load:', error);
        }
    }

    const logo = document.querySelector('.logo');
    logo.addEventListener('click', () => {
        const newUrl = '/'; 
        pjax.loadUrl(newUrl);
        tabHandler.updateSelectedTab(newUrl);
    });

    handlePageLoad(); // 初始页面加载时调用
});
