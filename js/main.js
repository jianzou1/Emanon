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
        { url: '/', text: 'Time Progress' },
        { url: '/page/article.html', text: 'Article' },
        { url: '/page/about.html', text: 'About Me' },
        { url: '/page/game.html', text: 'Game List' }
    ];

    // 创建 TabHandler 实例
    const tabHandler = new TabHandler('[role="tablist"]', tabData, pjax);
    
    // 切换加载动画的函数
    const toggleLoadingAnimation = (isLoading) => {
        if (isLoading) {
            // 显示加载动画
            initializeLoadingAnimation().then(showLoadingAnimation);
        } else {
            // 隐藏加载动画
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
                // 主页：更新进度条和初始化每日弹出窗口
                updateProgressBar();
                initializeDailyPopup();
            } else if (currentUrl === '/page/article.html') {
                // 文章页面：加载预览链接
                loadPreviewLinks(pjax, tabHandler); // 传递 pjax 和 tabHandler
            } else if (currentUrl === '/page/game.html') {
                // 游戏列表页面：调用 gameList 函数
                gameList(); // 直接调用 gameList 函数
            }

            footerLoader(); // 加载页脚内容
            handleScrollAndScrollToTop(); // 处理滚动和返回顶部
            initializeTips(); // 初始化提示

            const tablist = document.querySelector('[role="tablist"]'); // 获取标签列表
            if (tablist) {
                tablist.innerHTML = ''; // 清空标签内容
                new TabHandler('[role="tablist"]', tabData, pjax); // 重新创建 TabHandler
            }
        } catch (error) {
            // 捕获并记录加载过程中的错误
            console.error('Error during page load:', error);
        }
    }

    // 设置LOGO的点击事件
    const logo = document.querySelector('.logo');
    logo.addEventListener('click', () => {
        const newUrl = '/'; 
        pjax.loadUrl(newUrl); // 使用 PJAX 加载主页
        tabHandler.updateSelectedTab(newUrl); // 更新选中标签
    });

    handlePageLoad(); // 初始页面加载时调用
});
