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
        { url: '/page/about.html', text: 'About Me' }
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
        setupLinksContainer(); // 设置链接容器的事件监听
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
                loadPreviewLinks(); 
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

    // 设置链接容器的点击事件处理
    function setupLinksContainer() {
        const linksContainer = document.getElementById('links-container'); // 获取链接容器
        if (linksContainer) {
            linksContainer.addEventListener('click', (event) => {
                const target = event.target.closest('.link-container'); // 获取点击的链接容器
                if (target && target.dataset.url) {
                    event.preventDefault(); // 防止默认链接跳转
                    pjax.loadUrl(target.dataset.url); // 使用 PJAX 加载新页面
                    tabHandler.updateSelectedTab(target.dataset.url); // 更新选中标签
                } else {
                    // 如果没有找到 URL，记录错误
                    console.error('No URL found for this link container');
                }
            });
        }
    }
});
