// gallery.js
import { fetchJSON } from '/js/dataCache.js';
import { getSystemValue } from '/js/utils.js';

const CONFIG = {
    GALLERY_CONFIG_URL: '/cfg/gallery_cfg.json',
    SYSTEM_CONFIG_URL: '/cfg/system_cfg.json'
};

// 模块级状态，用于跨调用清理
let activeObserver = null;
let activeWindowClickHandler = null;

/**
 * 清理画廊模块的后台资源（IntersectionObserver + window click 监听器）。
 * 在 PJAX 导航离开画廊页时由 main.js 调用。
 */
export function cleanupGallery() {
    if (activeObserver) {
        activeObserver.disconnect();
        activeObserver = null;
    }
    if (activeWindowClickHandler) {
        window.removeEventListener('click', activeWindowClickHandler);
        activeWindowClickHandler = null;
    }
}

export async function initializeGallery() {
    // 清理上一次初始化的残留资源
    cleanupGallery();

    const galleryImages = document.getElementById('gallery-images');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const pageIndicator = document.getElementById('pageIndicator');
    const titleSelect = document.getElementById('titleSelect');
    const topTitleDisplay = document.getElementById('topTitleDisplay');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const caption = document.getElementById('caption');
    const modalClose = document.getElementById('modalClose');

    let currentPage = 1;
    let allImages = [];
    let additional = '';
    let maxPage = 1;

    // 创建共享的 IntersectionObserver 实例（整个画廊生命周期复用）
    activeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('data-src');
                img.onload = () => { img.style.opacity = 1; };
                activeObserver.unobserve(img);
            }
        });
    });

    try {
        const [galleryData, systemData] = await Promise.all([
            fetchJSON(CONFIG.GALLERY_CONFIG_URL),
            fetchJSON(CONFIG.SYSTEM_CONFIG_URL)
        ]);
        additional = getSystemValue(systemData, 'additional');
        allImages = normalizeGalleryData(galleryData);

        populateTitleSelect(allImages);
        titleSelect.addEventListener('change', handleTitleChange);
        modalClose.addEventListener('click', closeModal);

        // window click 使用模块级引用，便于清理
        activeWindowClickHandler = handleWindowClick;
        window.addEventListener('click', activeWindowClickHandler);

        prevButton.addEventListener('click', () => navigatePage(-1));
        nextButton.addEventListener('click', () => navigatePage(1));

        displayImages();
    } catch (error) {
        console.error('错误:', error);
        alert('加载失败: ' + error.message);
    }

    function normalizeGalleryData(data) {
        if (Array.isArray(data)) {
            if (data[0] && typeof data[0] === 'object' && 'title' in data[0]) {
                return data;
            }
            if (Array.isArray(data[1])) return data[1];
        }
        return [];
    }

    function populateTitleSelect(images) {
        const titles = [...new Set(images.map(image => image.title))];
        titles.forEach(title => {
            const imagesCount = images.filter(image => image.title === title).length;
            const option = document.createElement('option');
            option.value = title;
            option.textContent = `${title} (${imagesCount}p)`;
            titleSelect.appendChild(option);
        });
    }

    function handleTitleChange() {
        currentPage = 1;
        displayImages();
    }

    function displayImages() {
        galleryImages.innerHTML = '';
        const selectedTitle = titleSelect.value;
        const imagesForTitle = allImages.filter(image => image.title === selectedTitle);
        maxPage = Math.max(...imagesForTitle.map(image => image.page)) || 1;

        const imagesToDisplay = imagesForTitle.filter(image => image.page === currentPage);
        imagesToDisplay.forEach(createImageElement);
        
        pageIndicator.textContent = `${currentPage} / ${maxPage} `;
        topTitleDisplay.textContent = `${selectedTitle}`;
        lazyLoadImages();
        updateNavigationButtons();
    }

    function createImageElement(image) {
        const imgElement = document.createElement('img');
        imgElement.setAttribute('data-src', image.url + additional);
        imgElement.alt = image.mark;
        imgElement.title = image.mark;
        imgElement.style.opacity = 0;
        imgElement.addEventListener('click', () => openModal(image));
        galleryImages.appendChild(imgElement);
    }

    function openModal(image) {
        modalImage.src = image.url;
        caption.textContent = image.mark;
        imageModal.style.display = "flex";
    }

    function closeModal() {
        imageModal.style.display = "none";
    }

    function handleWindowClick(event) {
        if (event.target === imageModal) {
            closeModal();
        }
    }

    function navigatePage(direction) {
        currentPage += direction;
        displayImages();
    }

    function updateNavigationButtons() {
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === maxPage;
    }

    function lazyLoadImages() {
        const imgs = document.querySelectorAll('#gallery-images img');
        imgs.forEach(img => activeObserver.observe(img));
    }
}
