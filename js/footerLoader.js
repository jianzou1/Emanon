// footerLoader.js
import langManager from '/js/langManager.js'; 
export function footerLoader() {
    const footerContainer = document.querySelector('.dynamic-footer');

    if (!footerContainer) {
        console.error(langManager.translate('errors.element_not_found', 'dynamic-footer'));
        return;
    }

    // 检查路径是否包含'post'
    const isPostPage = window.location.href.includes('post');

    // 页脚模板（根据条件决定是否包含last-updated元素）
    const footerContent = `
      <div class="status-bar">
        <p class="status-bar-field" data-lang-id="footer_name"></p>
        <p class="status-bar-field" data-lang-id="footer_art"></p>
        ${!isPostPage ? '<p class="status-bar-field" id="last-updated" data-lang-id="footer_update_time"></p>' : ''}
      </div>
    `;
    
    footerContainer.innerHTML = footerContent;

    // 如果不是post页面，则处理更新时间
    if (!isPostPage) {
        const lastUpdatedElement = footerContainer.querySelector('#last-updated');

        const handleParameters = async () => {
            try {
                const lastUpdated = await getLastUpdatedDateFromGitHub();
                // 使用新的参数传递方式
                langManager.applyParameters(
                    lastUpdatedElement,
                    'footer_update_time',
                    lastUpdated
                );
            } catch (error) {
                console.error(langManager.translate('errors.update_time_fetch'));
                langManager.applyParameters(
                    lastUpdatedElement,
                    'footer_update_time',
                    '---'
                );
            }
        };

        // 初始化语言管理器
        if (!langManager.isInitialized) {
            langManager.init().then(handleParameters);
        } else {
            handleParameters();
        }
    }
}

// 从GitHub获取最后更新时间的函数
async function getLastUpdatedDateFromGitHub() {
    const url = 'https://api.github.com/repos/jianzou1/drunkfrog';
    const cacheKey = 'lastUpdatedDate';
    const cacheExpiration = 3600000; // 1小时缓存

    // 检查缓存
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        const { timestamp, date } = JSON.parse(cachedData);
        if (Date.now() - timestamp < cacheExpiration) {
            return date;
        }
    }

    // 获取最新数据
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(langManager.translate('errors.api_fetch', response.status));
    }
    
    const data = await response.json();
    const lastUpdated = new Date(data.updated_at).toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 更新缓存
    localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        date: lastUpdated
    }));

    return lastUpdated;
}