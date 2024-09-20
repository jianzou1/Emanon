// previewLoader.js

// 导出 loadPreviewLinks 函数
export async function loadPreviewLinks() {
    console.log('loadPreviewLinks called');

    const links = [
        { id: 1, url: '/post/gd_occams_razor/index.html', icon: '/icon/text-markdown.png' },
        { id: 5, url: '/post/gd_sample_hero_ape/index.html', icon: '/icon/application-x-genesis-rom.png' },
        { id: 4, url: '/post/gd_sample_ingame_capture/index.html', icon: '/icon/application-x-nes-rom.png' },
        { id: 6, url: '/post/gd_sample_ingame_party_point/index.html', icon: '/icon/application-x-gamecube-rom.png' },
        { id: 3, url: '/post/gd_sample_ingame_recoil/index.html', icon: '/icon/application-x-nes-rom.png' },
        { id: 7, url: '/post/gd_sample_system_battlepass/index.html', icon: '/icon/application-x-gamecube-rom.png' },
        { id: 2, url: '/post/gd_system/index.html', icon: '/icon/text-markdown.png' },
    ];

    // 按 ID 升序排列链接
    links.sort((a, b) => a.id - b.id);

    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) {
        console.log('Links container not found, stopping execution logic');
        return;
    }

    linksContainer.innerHTML = ''; // 清空容器

    const linkPromises = links.map(link => fetchTitleAndCreateLinkDiv(link));

    const linkDivs = await Promise.allSettled(linkPromises); // 等待所有请求完成
    linkDivs.forEach(result => {
        if (result.status === 'fulfilled') {
            linksContainer.appendChild(result.value); // 插入 DOM
        } else {
            console.error(result.reason); // 处理错误
        }
    });
}

// 获取标题并创建链接 div
const fetchTitleAndCreateLinkDiv = async (link) => {
    try {
        const response = await fetch(link.url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        const title = doc.querySelector('title')?.textContent || '未命名'; // 获取 <title> 元素
        return createLinkDiv(title, link);
    } catch (error) {
        console.error(`Error fetching content for: ${link.url}`, error);
        return createLinkDiv('无法加载标题', link); // 返回错误内容
    }
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
