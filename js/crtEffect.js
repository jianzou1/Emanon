// crtEffect.js

// 导出 initCRT 函数以供其他模块使用
export function initCRT() {
    const canvas = document.querySelector('.crt-effect');
    if (!canvas) {
        console.error('CRT canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    const speed = 0.06; // 进一步减小更新速度
    let offset = 0; 
    let isEffectEnabled = true; // 开关变量，初始为启用状态

    // 清除画布并填充背景
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 绘制单个扫描线
    function drawSingleScanLine(y, offset) {
        const baseOffset = (offset % 4);
        const colorOffsets = ['rgba(255, 0, 0, 0.08)', 'rgba(0, 255, 0, 0.08)', 'rgba(0, 0, 255, 0.08)'];

        colorOffsets.forEach((color, index) => {
            const colorOffset = baseOffset + Math.sin(y / 50) * 0.2;
            ctx.fillStyle = color;
            ctx.fillRect(0, (y + colorOffset) % canvas.height, canvas.width, 1);
        });
    }

    // 执行扫描线的绘制
    function drawScanLines() {
        for (let i = 0; i < canvas.height; i += 4) {
            drawSingleScanLine(i, offset);
        }
    }

    // 初始化函数
    function drawCRT() {
        if (!isEffectEnabled) return; // 如果效果关闭，则直接返回

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        clearCanvas(); // 清除并填充背景
        drawScanLines(); // 绘制动态扫描线
        
        // 更新偏移量
        offset += speed;
        requestAnimationFrame(drawCRT); 
    }

    // 启动绘制函数
    function startCRT() {
        drawCRT();
    }

    // 切换效果的函数
    function toggleEffect() {
        isEffectEnabled = !isEffectEnabled; // 切换状态
        if (isEffectEnabled) {
            startCRT(); // 启动效果
        } else {
            clearCanvas(); // 如果效果关闭，清除画布
        }
    }

    // 监听复选框状态变更
    const checkbox = document.getElementById('crtToggle');
    checkbox.addEventListener('change', () => {
        isEffectEnabled = checkbox.checked; // 更新状态
        isEffectEnabled ? startCRT() : clearCanvas(); // 根据状态启动或禁用效果
    });

    // 检查复选框状态并启动效果
    function checkCheckboxState() {
        isEffectEnabled = checkbox.checked;
        isEffectEnabled ? startCRT() : clearCanvas(); // 根据状态启动或禁用效果
    }

    // 添加事件监听器以处理窗口加载和调整大小的事件
    window.addEventListener('load', checkCheckboxState);
    window.addEventListener('resize', checkCheckboxState);
}
