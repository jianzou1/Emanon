// gallery.js

export async function initializeGallery() {
    try {
        const CONFIG_URL = '/cfg/gallery_cfg.json';
        const galleryImages = document.getElementById('gallery-images');
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        const pageIndicator = document.getElementById('pageIndicator');
        const titleSelect = document.getElementById('titleSelect');

        let currentPage = 1;
        let allImages = [];
        let additional = '';
        let maxPage = 1;

        const response = await fetch(CONFIG_URL);
        if (!response.ok) throw new Error('网络错误，请重试'); // 错误处理
        const data = await response.json();

        additional = data[0][0]?.additional || '';
        allImages = data[1];

        const titles = [...new Set(allImages.map(image => image.title))];
        titles.forEach(title => {
            const option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            titleSelect.appendChild(option);
        });

        titleSelect.addEventListener('change', () => {
            currentPage = 1;
            displayImages();
        });

        function displayImages() {
            galleryImages.innerHTML = '';

            const selectedTitle = titleSelect.value;
            const imagesForTitle = allImages.filter(image => image.title === selectedTitle);

            maxPage = Math.max(...imagesForTitle.map(image => image.page)) || 1;

            const imagesToDisplay = imagesForTitle.filter(image => image.page === currentPage)
                .sort((a, b) => a.id - b.id);

            imagesToDisplay.forEach(image => {
                const imgElement = document.createElement('img');
                imgElement.setAttribute('data-src', image.url + additional);
                imgElement.alt = image.mark;
                imgElement.title = image.mark;
                imgElement.style.opacity = 0;
                galleryImages.appendChild(imgElement);
            });

            pageIndicator.textContent = `第 ${currentPage} / ${maxPage} 页`;
            lazyLoadImages();
            updateNavigationButtons();
        }

        function updateNavigationButtons() {
            prevButton.disabled = currentPage === 1;
            nextButton.disabled = currentPage === maxPage;
        }

        function lazyLoadImages() {
            const imgs = document.querySelectorAll('.gallery-images img');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.getAttribute('data-src');
                        img.onload = () => {
                            img.style.opacity = 1;
                        };
                        observer.unobserve(img);
                    }
                });
            });
            imgs.forEach(img => {
                observer.observe(img);
            });
        }

        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayImages();
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentPage < maxPage) {
                currentPage++;
                displayImages();
            }
        });

        displayImages();
    } catch (error) {
        console.error(error);
        alert('加载失败: ' + error.message);
    }
}
