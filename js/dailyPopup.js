// dailyPopup.js

export function initializeDailyPopup() {
    document.addEventListener('DOMContentLoaded', showDailyPopup);
}

// 配置项：弹窗展示时间间隔，单位为秒
const popupInterval = 1; // 默认值为 24 小时（86400 秒）

async function fetchAndProcess(url, successCallback, errorCallback) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const data = await response.text();
        successCallback(data);
    } catch (error) {
        console.error('Error loading content:', error);
        errorCallback?.(error);
    }
}

async function showDailyPopup() {
    const now = Date.now();
    const lastShown = localStorage.getItem('dailyPopupLastShown');
    const lastShownTime = lastShown ? new Date(lastShown).getTime() : 0;

    if (!lastShown || (now - lastShownTime) / 1000 >= popupInterval) {
        await fetchAndProcess('/ui/dailyPopup.html', displayPopupContent, error => {
            console.error('Error loading daily popup:', error);
        });
    }
}

function displayPopupContent(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = doc.body.innerHTML;
    document.body.appendChild(popupContainer);

    doc.querySelectorAll('style').forEach(style => {
        const existingStyle = document.head.querySelector(`style[data-id="${style.getAttribute('data-id')}"]`);
        if (!existingStyle) document.head.appendChild(style);
    });

    doc.querySelectorAll('script').forEach(script => {
        const existingScript = document.body.querySelector(`script[data-id="${script.getAttribute('data-id')}"]`);
        if (!existingScript) {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
        }
    });

    initPopup();
    localStorage.setItem('dailyPopupLastShown', new Date().toISOString());
}

function initPopup() {
    const closeButton = document.getElementById('close-popup');
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('welcome-popup');

    if (!closeButton || !overlay || !popup) {
        console.error('Popup elements not found');
        return;
    }

    // ESC关闭处理函数
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            closePopup();
        }
    };

    // 绑定键盘事件
    document.addEventListener('keydown', handleKeyDown);

    // 增强关闭功能
    const originalClose = closePopup;
    let isClosed = false;

    closePopup = () => {
        if (isClosed) return;
        isClosed = true;
        
        // 移除事件监听
        document.removeEventListener('keydown', handleKeyDown);
        
        // 执行原始关闭逻辑
        originalClose();
    };

    // 点击关闭按钮
    closeButton.addEventListener('click', closePopup);
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', closePopup);

    // 防止事件冒泡
    popup.addEventListener('click', e => e.stopPropagation());
}

// 基础关闭逻辑
function closePopup() {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('welcome-popup');
    
    if (overlay) overlay.style.display = 'none';
    if (popup) popup.style.display = 'none';
}

// 全局访问
window.closePopup = closePopup;

// 初始化
initializeDailyPopup();