// previewLoader.js

// 导出 loadPreviewLinks 函数
export function loadPreviewLinks() {
    console.log('loadPreviewLinks called'); // 调试输出

    const links = [
        { id: 1, url: '/post/gd_occams_razor', icon: '/icon/text-markdown.png' },
        { id: 5, url: '/post/gd_sample_hero_ape', icon: '/icon/application-x-genesis-rom.png' },
        { id: 4, url: '/post/gd_sample_ingame_capture', icon: '/icon/application-x-nes-rom.png' },
        { id: 6, url: '/post/gd_sample_ingame_party_point', icon: '/icon/application-x-gamecube-rom.png' },
        { id: 3, url: '/post/gd_sample_ingame_recoil', icon: '/icon/application-x-nes-rom.png' },
        { id: 7, url: '/post/gd_sample_system_battlepass', icon: '/icon/application-x-gamecube-rom.png' },
        { id: 2, url: '/post/gd_system', icon: '/icon/text-markdown.png' },
    ];

    // 按 ID 升序排列链接
    links.sort((a, b) => a.id - b.id);

    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) {
        console.log('Links container not found, stopping execution logic'); // 打印普通日志
        return; // 找不到容器，停止执行逻辑
    }

    // 清空容器，重新加载内容
    linksContainer.innerHTML = '';

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

    links.forEach(link => {
        const layoutUrl = `${link.url}/layout.html`;

        fetch(layoutUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const title = doc.querySelector('title')?.textContent || '未命名'; // 从链接中获取标题
                linksContainer.appendChild(createLinkDiv(title, link)); // 动态插入内容
            })
            .catch(error => {
                console.error(`Error fetching content for: ${layoutUrl}`, error);
                linksContainer.appendChild(createLinkDiv('无法加载标题', link)); // 动态插入错误内容
            });
    });
}
