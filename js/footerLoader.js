// footerLoader.js
import langManager from '/js/langManager.js'; 
export function footerLoader(isTabSwitch = false) {
    // ★ Tab 缓存切换快速路径：footer 已在缓存的 HTML 中，检测是否已存在
    if (isTabSwitch) {
        const existingFooter = document.querySelector('#main .window-footer');
        if (existingFooter) {
            // footer 已存在，仅确保动态数据（GitHub 更新时间）已填充
            refreshFooterData(existingFooter);
            return;
        }
        // footer 不存在，走完整创建逻辑
    }
    // 优先插入到 .window 内部底部（紧跟 .window-body 之后）
    // 回退到 .dynamic-footer（兼容无 .window 的页面）
    const windowEl = document.querySelector('#main .window[role="tabpanel"]')
                  || document.querySelector('#main .window');
    const fallbackContainer = document.querySelector('.dynamic-footer');

    // 清理旧的页脚（防止 PJAX 切换后重复）
    document.querySelectorAll('.window-footer').forEach(el => el.remove());
    if (fallbackContainer) fallbackContainer.innerHTML = '';

    // 检查路径是否包含'post'
    const isPostPage = window.location.href.includes('post');

    // 页脚模板
    // post 页面：从 .window[data-publish-date] 读取发布日期（在 #main 内，PJAX 可替换）
    let postDateField = '';
    if (isPostPage) {
        const dateWindow = document.querySelector('#main .window[data-publish-date]');
        if (dateWindow) {
            postDateField = `<p class="status-bar-field" id="post-publish-date" data-lang-id="post_publish_date"></p>`;
        }
    }

    const footerContent = `
      <div class="status-bar window-footer">
        <p class="status-bar-field" data-lang-id="footer_name"></p>
        ${isPostPage ? postDateField : '<p class="status-bar-field" id="last-updated" data-lang-id="footer_update_time"></p>'}
        ${!isPostPage ? '<p class="status-bar-field footer-password-link"><a href="#" data-about-popup data-no-pjax data-lang-id="about_title"></a></p>' : ''}
      </div>
    `;

    if (windowEl) {
        // 插入到 .window 的末尾（.window-body 之后）
        windowEl.insertAdjacentHTML('beforeend', footerContent);
    } else if (fallbackContainer) {
        fallbackContainer.innerHTML = footerContent;
    } else {
        console.error('[Footer] dynamic-footer container not found');
        return;
    }

    // 查找刚插入的元素并注入多语言参数
    if (isPostPage) {
        const publishDateEl = document.getElementById('post-publish-date');
        if (publishDateEl) {
            const windowEl2 = document.querySelector('#main .window[data-publish-date]');
            const dateStr = windowEl2 ? windowEl2.getAttribute('data-publish-date').replace(/-/g, '/') : '';
            const applyDate = () => langManager.applyParameters(publishDateEl, 'post_publish_date', dateStr);
            if (langManager.isInitialized) {
                applyDate();
            } else {
                langManager.init().then(applyDate);
            }
        }
    } else {
        const lastUpdatedElement = document.getElementById('last-updated');
        if (!lastUpdatedElement) return;

        const handleParameters = async () => {
            try {
                const lastUpdated = await getLastUpdatedDateFromGitHub();
                langManager.applyParameters(
                    lastUpdatedElement,
                    'footer_update_time',
                    lastUpdated
                );
            } catch (error) {
                console.error('[Footer] update time fetch failed');
                langManager.applyParameters(
                    lastUpdatedElement,
                    'footer_update_time',
                    '---'
                );
            }
        };

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
    const cacheExpiration = 86400000; // 24小时缓存（增加从1小时）
    const fallbackDate = new Date().toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 检查缓存
    let cachedData = null;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            cachedData = JSON.parse(cached);
        }
    } catch (e) {
        console.warn('[Footer] 缓存读取失败:', e);
    }

    // 如果缓存有效，直接返回
    if (cachedData) {
        const { timestamp, date } = cachedData;
        if (Date.now() - timestamp < cacheExpiration) {
            console.log('[Footer] 使用缓存的更新时间:', date);
            return date;
        }
    }

    // 获取最新数据
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            // 403 或 429 是速率限制，返回过期缓存而不是报错
            if ((response.status === 403 || response.status === 429) && cachedData) {
                console.warn(`[Footer] API 返回 ${response.status}，使用过期缓存`);
                return cachedData.date;
            }
            throw new Error(`HTTP ${response.status}`);
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
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                date: lastUpdated
            }));
            console.log('[Footer] 缓存已更新:', lastUpdated);
        } catch (e) {
            console.warn('[Footer] 缓存写入失败:', e);
        }

        return lastUpdated;
    } catch (error) {
        console.error('[Footer] GitHub API 调用失败:', error.message);
        
        // 如果有任何缓存（即使过期），优先返回它
        if (cachedData) {
            console.log('[Footer] API 失败，返回最后一次缓存:', cachedData.date);
            return cachedData.date;
        }

        // 所有都失败，返回当前日期作为最后降级
        console.log('[Footer] 返回当前日期作为降级方案');
        return fallbackDate;
    }
}

/**
 * Tab 缓存切换时 footer 已存在的轻量刷新：
 * 仅检查并填充动态数据（GitHub 更新时间），跳过 DOM 重建。
 */
function refreshFooterData(footerEl) {
    const isPostPage = window.location.href.includes('post');
    if (isPostPage) return; // post 页面不走 Tab 切换

    const lastUpdatedElement = footerEl.querySelector('#last-updated');
    if (!lastUpdatedElement || lastUpdatedElement.innerHTML.trim()) return; // 已有内容则跳过

    const handleParameters = async () => {
        try {
            const lastUpdated = await getLastUpdatedDateFromGitHub();
            langManager.applyParameters(lastUpdatedElement, 'footer_update_time', lastUpdated);
        } catch {
            langManager.applyParameters(lastUpdatedElement, 'footer_update_time', '---');
        }
    };

    if (langManager.isInitialized) {
        handleParameters();
    } else {
        langManager.init().then(handleParameters);
    }
}