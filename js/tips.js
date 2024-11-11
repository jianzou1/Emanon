// tips.js
export function initializeTips() {
    const tips = document.getElementById('tips');
    const elementsWithTips = document.querySelectorAll('[data-tips]'); // 选择所有有 data-tips 属性的元素

    // 配置 X 和 Y 的偏移量
    const offsetX = 80; // X轴偏移量，可以根据需要调整
    const offsetY = 0; // Y轴偏移量，可以根据需要调整

    elementsWithTips.forEach(element => {
        element.addEventListener('mouseenter', (event) => {
            const tipsText = element.getAttribute('data-tips'); // 获取提示文本
            tips.innerText = tipsText; // 设置提示文本
            tips.style.display = 'block'; // 显示提示

            // 计算并设置提示的位置
            const rect = element.getBoundingClientRect();

            // 计算新的位置，分别应用 X 和 Y 偏移量
            tips.style.left = `${rect.left + window.scrollX + offsetX}px`; // X位置，加上 X 偏移量
            tips.style.top = `${rect.bottom + window.scrollY + offsetY}px`; // Y位置，加上 Y 偏移量
            tips.style.opacity = 1; // 设置透明度
        });

        element.addEventListener('mouseleave', () => {
            tips.style.display = 'none'; // 隐藏提示
            tips.style.opacity = 0; // 设置透明度
        });
    });
}
