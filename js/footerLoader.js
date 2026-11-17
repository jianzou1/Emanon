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

        const handleParameters = () => {
            langManager.applyParameters(
                lastUpdatedElement,
                'footer_update_time',
                getBuildTime()
            );
        };

        if (!langManager.isInitialized) {
            langManager.init().then(handleParameters);
        } else {
            handleParameters();
        }
    }
}

// 页脚"最后更新"时间：直接取构建期注入的 __BUILD_TIME__。
// 早期版本在运行时请求 api.github.com 拿仓库 updated_at，带来三个问题：
//   1. 每次整页加载都打一个外部请求（含 60 次/小时的未认证限流风险）
//   2. URL 里写死的是旧仓库名 drunkfrog，改名后靠 GitHub 的重定向兜着
//   3. 需要 AbortController 超时 + localStorage 24 小时缓存一整套兜底逻辑
// 现在构建时就把时间戳写进产物，上面三项全部消失。
function getBuildTime() {
    const iso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null;
    if (!iso) return '---';

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '---';

    return date.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Tab 缓存切换时 footer 已存在的轻量刷新：
 * 仅检查并填充构建时间，跳过 DOM 重建。
 */
function refreshFooterData(footerEl) {
    const isPostPage = window.location.href.includes('post');
    if (isPostPage) return; // post 页面不走 Tab 切换

    const lastUpdatedElement = footerEl.querySelector('#last-updated');
    if (!lastUpdatedElement || lastUpdatedElement.innerHTML.trim()) return; // 已有内容则跳过

    const handleParameters = () => {
        langManager.applyParameters(lastUpdatedElement, 'footer_update_time', getBuildTime());
    };

    if (langManager.isInitialized) {
        handleParameters();
    } else {
        langManager.init().then(handleParameters);
    }
}