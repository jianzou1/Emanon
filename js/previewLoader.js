// previewLoader.js
// 直接在 window.onload 中调用
window.onload = loadPreviewLinks;

function loadPreviewLinks() {
    console.log('loadPreviewLinks called'); // 调试输出

    const links = [
        { id: 10000, url: '/post/gd_occams_razor' },
        { id: 10100, url: '/post/gd_sample_hero_ape' },
        { id: 10200, url: '/post/gd_sample_ingame_capture' },
        { id: 10300, url: '/post/gd_sample_ingame_party_point' },
        { id: 10400, url: '/post/gd_sample_ingame_recoil' },
        { id: 10500, url: '/post/gd_sample_system_battlepass' },
        { id: 10001, url: '/post/gd_system' },
    ];

    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) {
        console.log('Links container not found, stopping execution logic'); // 打印普通日志
        return; // 找不到容器，停止执行逻辑
    } 

    // 清空容器，重新加载内容
    linksContainer.innerHTML = '';

    links.sort((a, b) => a.id - b.id);

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
                const title = doc.querySelector('title')?.textContent || '未命名';
                const bodyContent = doc.body.textContent || '';

                const linkDiv = document.createElement('div');
                linkDiv.className = 'link-preview';
                linkDiv.id = `link-${link.id}`;
                linkDiv.innerHTML = `
                    <h3><a href="${link.url}" target="_self">${title}</a></h3>
                    <div class="content"><p>${bodyContent}</p></div>
                `;

                // 动态插入内容
                linksContainer.appendChild(linkDiv);
            })
            .catch(error => {
                console.error(`Error fetching content for: ${layoutUrl}`, error);
                const linkDiv = document.createElement('div');
                linkDiv.className = 'link-preview';
                linkDiv.id = `link-${link.id}`;
                linkDiv.innerHTML = `
                    <h3><a href="${link.url}" target="_self">无法加载标题</a></h3>
                    <div class="content"><p>无法加载内容</p></div>
                `;

                // 动态插入错误内容
                linksContainer.appendChild(linkDiv);
            });
    });
}
