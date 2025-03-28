// footerLoader.js
export function footerLoader() {
    const footerContainer = document.querySelector('.dynamic-footer');

    if (!footerContainer) {
        console.error('未找到类名为"dynamic-footer"的元素');
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
            const id = 'update_time';
            
            try {
                const lastUpdated = await getLastUpdatedDateFromGitHub();
                LangManager.setParams(id, [lastUpdated]);
            } catch (error) {
                console.error('设置更新时间失败:', error);
                LangManager.setParams(id, ['---']);
            }
        };

        // 初始化语言管理器
        if (!LangManager.isInitialized) {
            LangManager.init().then(handleParameters);
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
        throw new Error(`HTTP错误! 状态码: ${response.status}`);
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