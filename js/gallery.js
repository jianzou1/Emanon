// gallery.js

const CONFIG = {
    CONFIG_URL: '/cfg/gallery_cfg.json',
};

export async function initializeGallery() {
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

    try {
        const data = await fetchGalleryConfig();
        additional = data[0][0]?.additional || '';
        allImages = data[1];

        populateTitleSelect(allImages);
        titleSelect.addEventListener('change', handleTitleChange);
        modalClose.addEventListener('click', closeModal);
        window.addEventListener('click', handleWindowClick);
        prevButton.addEventListener('click', () => navigatePage(-1));
        nextButton.addEventListener('click', () => navigatePage(1));

        displayImages();
    } catch (error) {
        console.error('错误:', error);
        alert('加载失败: ' + error.message);
    }

    async function fetchGalleryConfig() {
        const response = await fetch(CONFIG.CONFIG_URL);
        if (!response.ok) throw new Error('网络错误，请重试');
        return await response.json();
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
        
        pageIndicator.textContent = `第 ${currentPage} / ${maxPage} 页`;
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
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.getAttribute('data-src');
                    img.onload = () => { img.style.opacity = 1; };
                    observer.unobserve(img);
                }
            });
        });
        imgs.forEach(img => observer.observe(img));
    }
}
