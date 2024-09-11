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

    const charLimit = 200; // 限制字符数
    const linksContainer = document.getElementById('links-container');

    // 排序链接数组按id升序
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

                // 移除所有<strong>标签
                const bodyContent = doc.body.innerHTML || '';
                const contentWithoutStrong = bodyContent.replace(/<\/?strong\b[^>]*>/gi, '');

                // 替换内容中的所有标签为<p>
                const replacedContent = contentWithoutStrong.replace(/<(\/?)(?!strong\b)[^>]+>/gi, (match, p1) => {
                    return p1 ? '</p>' : '<p>';
                });

                const truncatedContent = replacedContent.length > charLimit 
                    ? replacedContent.substring(0, charLimit) + '...' 
                    : replacedContent;

                const linkDiv = document.createElement('div');
                linkDiv.className = 'link-preview';
                linkDiv.id = `link-${link.id}`;
                linkDiv.innerHTML = `
                    <h3><a href="${link.url}" target="_self">${title}</a></h3>
                    <p>${truncatedContent}</p>
                `;

                // 确保按id升序插入
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
                    <p>无法加载内容</p>
                `;

                // 确保按id升序插入
                const insertBeforeElement = document.querySelector(`#link-${link.id + 1}`);
                if (insertBeforeElement) {
                    linksContainer.insertBefore(linkDiv, insertBeforeElement);
                } else {
                    linksContainer.appendChild(linkDiv);
                }
            });
    });
})();
