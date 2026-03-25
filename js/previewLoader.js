// previewLoader.js

// 内存缓存：避免 pjax 切换选项卡时重复 fetch + 重建 DOM
let cachedLinks = null;
let boundContainer = null; // 已绑定事件的容器引用，防止重复绑定

export async function loadPreviewLinks(pjax, tabHandler) {
    const links = cachedLinks || (cachedLinks = await fetchLinks());

    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) {
        console.warn('Links container not found');
        return;
    }

    linksContainer.innerHTML = '';

    // 批量创建 DOM（使用 DocumentFragment 减少重排）
    const fragment = document.createDocumentFragment();
    links.forEach(link => {
        fragment.appendChild(createLinkDiv(link.name, link.url, link.icon));
    });
    linksContainer.appendChild(fragment);

    // 事件委托只绑定一次
    if (boundContainer !== linksContainer) {
        setupLinksContainer(linksContainer, pjax, tabHandler);
        boundContainer = linksContainer;
    }
}

const fetchLinks = async () => {
    try {
        const response = await fetch('/cfg/article_cfg.json');
        if (!response.ok) throw new Error('配置加载失败');

        const links = await response.json();
        return links.map(({ id, url, icon, name }) => ({
            id,
            url: `/post/${url}`,
            icon: `/icon/${icon}`,
            name: name || '未命名'
        }));
    } catch (error) {
        console.error('配置加载失败:', error);
        return [];
    }
};

// 合并为单层 DOM：原 link-preview > link-container 两层合并为 link-preview 一层
const createLinkDiv = (title, url, icon) => {
    const div = document.createElement('div');
    div.className = 'link-preview';
    div.dataset.url = url;
    div.innerHTML = `
        <span class="link-icon" style="background-image: url('${icon}')"></span>
        <p class="link-title">${title}</p>
    `;
    return div;
};

const setupLinksContainer = (linksContainer, pjax, tabHandler) => {
    linksContainer.addEventListener('click', event => {
        const target = event.target.closest('.link-preview');
        if (target?.dataset.url) {
            event.preventDefault();
            pjax.loadUrl(target.dataset.url);
            tabHandler.updateSelectedTab(target.dataset.url);
        }
    });
};
