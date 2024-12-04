// previewLoader.js

// 导出 loadPreviewLinks 函数
export async function loadPreviewLinks(pjax, tabHandler) {
    const links = await fetchLinks(); // 获取链接数组

    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) {
        console.warn('Links container not found, stopping execution logic');
        return;
    }

    linksContainer.innerHTML = ''; // 清空容器

    const linkDivs = await Promise.allSettled(links.map(fetchTitleAndCreateLinkDiv));

    // 渲染链接 div
    linkDivs.forEach(result => result.status === 'fulfilled' 
        ? linksContainer.appendChild(result.value) 
        : console.error('Error rendering link div:', result.reason)
    );

    setupLinksContainer(linksContainer, pjax, tabHandler); // 处理链接容器点击事件
}

// 从 JSON 文件获取链接数组
const fetchLinks = async () => {
    try {
        const response = await fetch('/cfg/article_cfg.json');
        if (!response.ok) throw new Error('Network response was not ok');

        const links = await response.json();
        return links.map(({ id, url, icon }) => ({
            id,
            url: `/post/${url}/index.html`, // 根据原始 URL 构造链接
            icon: `/icon/${icon}` // 根据原始图标路径构造图标链接
        }));
    } catch (error) {
        console.error('Error fetching links:', error);
        return []; // 返回空数组以避免后续的错误
    }
};

// 获取标题并创建链接 div
const fetchTitleAndCreateLinkDiv = async ({ url, icon }) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.text();
        const title = parseTitle(data); // 解析标题
        return createLinkDiv(title, { url, icon });
    } catch (error) {
        console.error(`Error fetching content for: ${url}`, error);
        return createLinkDiv('无法加载标题', { url, icon }); // 返回错误内容
    }
}

// 解析标题
const parseTitle = (data) => {
    const doc = new DOMParser().parseFromString(data, 'text/html');
    return doc.querySelector('title')?.textContent.trim() || '未命名'; // 获取 <title> 元素
}

// 创建链接 div
const createLinkDiv = (title, { url, icon }) => {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'link-preview';
    linkDiv.innerHTML = `
        <div class="link-container" data-url="${url}">
            <span class="link-icon" style="background-image: url('${icon}');"></span>
            <p class="link-title">${title}</p>
        </div>
    `;
    return linkDiv;
};

// 设置链接容器的点击事件处理
const setupLinksContainer = (linksContainer, pjax, tabHandler) => {
    linksContainer.addEventListener('click', (event) => {
        const target = event.target.closest('.link-container'); // 获取点击的链接容器
        if (target?.dataset.url) {
            event.preventDefault(); // 防止默认链接跳转
            pjax.loadUrl(target.dataset.url); // 使用 PJAX 加载新页面
            tabHandler.updateSelectedTab(target.dataset.url); // 更新选中标签
        } else {
            console.warn('No URL found for this link container');
        }
    });
};
