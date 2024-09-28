// loadingAnimation.js

// 图片资源列表
const imageSources = [
    '/icon/loading/brasero-disc-05.png',
    '/icon/loading/brasero-disc-10.png',
    '/icon/loading/brasero-disc-15.png',
    '/icon/loading/brasero-disc-20.png',
    '/icon/loading/brasero-disc-25.png',
    '/icon/loading/brasero-disc-30.png',
    '/icon/loading/brasero-disc-35.png',
    '/icon/loading/brasero-disc-40.png',
    '/icon/loading/brasero-disc-45.png',
    '/icon/loading/brasero-disc-50.png',
    '/icon/loading/brasero-disc-55.png',
    '/icon/loading/brasero-disc-60.png',
    '/icon/loading/brasero-disc-65.png',
    '/icon/loading/brasero-disc-70.png',
    '/icon/loading/brasero-disc-75.png',
    '/icon/loading/brasero-disc-80.png',
    '/icon/loading/brasero-disc-85.png',
    '/icon/loading/brasero-disc-90.png',
    '/icon/loading/brasero-disc-95.png',
    '/icon/loading/brasero-disc-100.png',
];

// 预加载图片
function preloadImages(images) {
    return new Promise((resolve, reject) => {
        if (images.length === 0) {
            return resolve(); // 如果没有图片，直接解决
        }

        let loadedImages = 0;

        images.forEach((src) => {
            const img = new Image();
            img.src = src;

            img.onload = () => {
                loadedImages++;
                if (loadedImages === images.length) {
                    resolve(); // 所有图片加载完成
                }
            };

            img.onerror = () => {
                reject(new Error(`Failed to load image: ${src}`)); // 使用 Error 对象
            };
        });
    });
}

// 加载动画 DOM 结构
export function loadLoadingAnimation() {
    return new Promise((resolve, reject) => {
        const loadingContainer = document.getElementById('loading-container');
        fetch('/ui/loading.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error loading loading.html: ${response.status} - ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                loadingContainer.innerHTML = html;
                resolve(); // 加载成功
            })
            .catch(error => {
                reject(error); // 处理错误
            });
    });
}

// 显示加载动画
export function showLoadingAnimation() {
    const loadingAnimation = document.getElementById('loading-animation');
    const loadingContainer = document.getElementById('loading-container');

    if (loadingAnimation && loadingContainer) {
        loadingAnimation.style.display = 'block'; // 显示加载动画
        loadingContainer.style.display = 'block'; // 显示 loading-container

        loadingAnimation.addEventListener('animationend', hideLoadingAnimation);
    } else {
        console.error('Loading animation element or container not found.'); // 错误信息
    }
}

// 隐藏加载动画
export function hideLoadingAnimation() {
    const loadingAnimation = document.getElementById('loading-animation');
    const loadingContainer = document.getElementById('loading-container');

    if (loadingAnimation) {
        loadingAnimation.style.display = 'none'; // 隐藏加载动画
    }
    if (loadingContainer) {
        loadingContainer.style.display = 'none'; // 隐藏 loading-container
    }
}

// 初始化加载动画函数
export function initializeLoadingAnimation() {
    // 先预加载图片
    return preloadImages(imageSources)
        .then(loadLoadingAnimation)
        .then(showLoadingAnimation)
        .catch((error) => {
            console.error('Error during loading animation initialization:', error);
        });
}
