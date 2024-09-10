// previewLoader.js

(function () {
    const links = [
        { id: 1, url: '../post/gd_sample_ingame_recoil', name: '页面1' },
        { id: 2, url: '../post/gd_system', name: '页面2' },
        { id: 3, url: '../post/gd_occams_razor', name: '页面2' },
        // 可以继续添加链接
    ];

    const charLimit = 500; // 限制字符数
    const linksContainer = document.getElementById('links-container');

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
                const title = doc.querySelector('title').textContent || '未命名';

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
                    <h3><a href="${link.url}" target="_blank">${title}</a></h3>
                    <p>${truncatedContent}</p>
                `;

                linksContainer.appendChild(linkDiv);
            })
            .catch(error => {
                console.error('Error fetching content:', error);
                const linkDiv = document.createElement('div');
                linkDiv.className = 'link-preview';
                linkDiv.id = `link-${link.id}`;
                linkDiv.innerHTML = `
                    <h3><a href="${link.url}" target="_blank">${link.name}</a></h3>
                    <p>无法加载内容</p>
                `;

                linksContainer.appendChild(linkDiv);
            });
    });
})();
