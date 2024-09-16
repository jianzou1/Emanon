// previewLoader.js

(function () {
    const links = [
        { id: 10000, url: '/post/gd_occams_razor' },
        { id: 10100, url: '/post/gd_sample_hero_ape' },
        { id: 10200, url: '/post/gd_sample_ingame_capture' },
        { id: 10300, url: '/post/gd_sample_ingame_party_point' },
        { id: 10400, url: '/post/gd_sample_ingame_recoil' },
        { id: 10500, url: '/post/gd_sample_system_battlepass' },
        { id: 10001, url: '/post/gd_system' },
        // 可以继续添加链接
    ];

    const linksContainer = document.getElementById('links-container');

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

                // 获取body内容并移除所有HTML标签
                const bodyContent = doc.body.textContent || '';

                const linkDiv = document.createElement('div');
                linkDiv.className = 'link-preview';
                linkDiv.id = `link-${link.id}`;
                linkDiv.innerHTML = `
                    <h3><a href="${link.url}" target="_self">${title}</a></h3>
                    <div class="content"><p>${bodyContent}</p></div>
                `;

                const insertBeforeElement = document.querySelector(`#link-${link.id + 1}`);
                if (insertBeforeElement) {
                    linksContainer.insertBefore(linkDiv, insertBeforeElement);
                } else {
                    linksContainer.appendChild(linkDiv);
                }
            })
            .catch(error => {
                console.error('Error fetching content:', error);
                const linkDiv = document.createElement('div');
                linkDiv.className = 'link-preview';
                linkDiv.id = `link-${link.id}`;
                linkDiv.innerHTML = `
                    <h3><a href="${link.url}" target="_self">无法加载标题</a></h3>
                    <div class="content"><p>无法加载内容</p></div>
                `;

                const insertBeforeElement = document.querySelector(`#link-${link.id + 1}`);
                if (insertBeforeElement) {
                    linksContainer.insertBefore(linkDiv, insertBeforeElement);
                } else {
                    linksContainer.appendChild(linkDiv);
                }
            });
    });
})();
