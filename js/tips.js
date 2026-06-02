// tips.js
import langManager from '/js/langManager.js';

let currentElement = null;
let tipsElement = null;
let initialized = false; // 单例标志：全局事件委托和 Observer 只绑定一次

const OFFSET_X = 80;
const OFFSET_Y = 0;

// 更新提示内容
const updateTipContent = () => {
    if (!currentElement || !tipsElement) return;
    const tipsKey = currentElement.getAttribute('data-tips');
    tipsElement.textContent = langManager.translate(tipsKey);
};

// 更新提示位置
const updateTipPosition = () => {
    if (!currentElement || !tipsElement) return;
    const rect = currentElement.getBoundingClientRect();
    tipsElement.style.left = `${rect.left + window.scrollX + OFFSET_X}px`;
    tipsElement.style.top = `${rect.bottom + window.scrollY + OFFSET_Y}px`;
};

// 处理鼠标移入——使用事件委托，从 target 向上查找 [data-tips]
const handleMouseOver = (event) => {
    const target = event.target.closest('[data-tips]');
    if (!target || target === currentElement) return;
    currentElement = target;
    updateTipContent();
    updateTipPosition();
    tipsElement.style.display = 'block';
    tipsElement.style.opacity = 1;
};

// 处理鼠标移出——检查 relatedTarget 是否仍在 [data-tips] 内部
const handleMouseOut = (event) => {
    if (!currentElement) return;
    const related = event.relatedTarget;
    if (related && currentElement.contains(related)) return;
    currentElement = null;
    tipsElement.style.display = 'none';
    tipsElement.style.opacity = 0;
};

export async function initializeTips() {
    // 等待多语言系统初始化完成
    await langManager.init();

    // 每次 PJAX 导航后重新获取 #tips 元素引用（DOM 可能已被替换）
    tipsElement = document.getElementById('tips');

    // 全局事件委托和 Observer 只绑定一次
    if (initialized) return;
    initialized = true;

    // 使用 mouseover/mouseout 事件委托（冒泡），替代逐元素 mouseenter/mouseleave
    document.body.addEventListener('mouseover', handleMouseOver);
    document.body.addEventListener('mouseout', handleMouseOut);
}