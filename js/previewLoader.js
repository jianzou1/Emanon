// previewLoader.js

// 导出 loadPreviewLinks 函数
export async function loadPreviewLinks(pjax, tabHandler) {
    const links = getLinks(); // 获取链接数组

    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) {
        console.warn('Links container not found, stopping execution logic');
        return;
    }

    linksContainer.innerHTML = ''; // 清空容器

    const linkDivs = await Promise.allSettled(links.map(fetchTitleAndCreateLinkDiv));

    // 渲染链接 div
    linkDivs.forEach(result => renderLinkDiv(linksContainer, result));
    
    setupLinksContainer(linksContainer, pjax, tabHandler); // 处理链接容器点击事件
}

// 获取链接数组
const getLinks = () => [
    { id: 1, url: '/post/gd_occams_razor/index.html', icon: '/icon/text-markdown.png' },
    { id: 5, url: '/post/gd_sample_hero_ape/index.html', icon: '/icon/application-x-genesis-rom.png' },
    { id: 4, url: '/post/gd_sample_ingame_capture/index.html', icon: '/icon/application-x-nes-rom.png' },
    { id: 6, url: '/post/gd_sample_ingame_party_point/index.html', icon: '/icon/application-x-gamecube-rom.png' },
    { id: 3, url: '/post/gd_sample_ingame_recoil/index.html', icon: '/icon/application-x-nes-rom.png' },
    { id: 7, url: '/post/gd_sample_system_battlepass/index.html', icon: '/icon/application-x-gamecube-rom.png' },
    { id: 2, url: '/post/gd_system/index.html', icon: '/icon/text-markdown.png' },
];

// 获取标题并创建链接 div
const fetchTitleAndCreateLinkDiv = async (link) => {
    try {
        const response = await fetch(link.url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.text();
        const title = parseTitle(data); // 解析标题
        return createLinkDiv(title, link);
    } catch (error) {
        console.error(`Error fetching content for: ${link.url}`, error);
        return createLinkDiv('无法加载标题', link); // 返回错误内容
    }
}

// 解析标题
const parseTitle = (data) => {
    const doc = new DOMParser().parseFromString(data, 'text/html');
    return doc.querySelector('title')?.textContent.trim() || '未命名'; // 获取 <title> 元素
}

// 创建链接 div
const createLinkDiv = (title, link) => {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'link-preview';
    linkDiv.innerHTML = `
        <div class="link-container" data-url="${link.url}">
            <span class="link-icon" style="background-image: url('${link.icon}');"></span>
            <p class="link-title">${title}</p>
        </div>
    `;
    return linkDiv;
};

// 渲染链接 div
const renderLinkDiv = (linksContainer, result) => {
    if (result.status === 'fulfilled') {
        linksContainer.appendChild(result.value); // 插入 DOM
    } else {
        console.error('Error rendering link div:', result.reason); // 处理错误
    }
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
