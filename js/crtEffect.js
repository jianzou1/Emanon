// crtEffect.js

// 导出 initCRT 函数以供其他模块使用
export function initCRT() {
    const canvas = document.querySelector('.crt-effect');
    if (!canvas) {
        console.error('CRT canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    let offset = 0; 
    const speed = 0.06; // 进一步减小更新速度
    let isEffectEnabled = true; // 开关变量，初始为启用状态

    // 初始化函数
    function drawCRT() {
        if (!isEffectEnabled) return; // 如果效果关闭，则直接返回
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // 清除并填充背景
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制动态扫描线
        drawScanLines();
        
        // 更新偏移量
        offset += speed;
        requestAnimationFrame(drawCRT); 
    }

    // 执行扫描线的绘制
    function drawScanLines() {
        for (let i = 0; i < canvas.height; i += 4) { // 增加扫描线间隔到8像素
            const baseOffset = (offset % 4); // 基本偏移量，保持一致
            const redOffset = baseOffset + Math.sin(i / 50) * 0.2; // 红色偏移，减少幅度
            const greenOffset = baseOffset + Math.sin(i / 50) * 0.2; // 绿色偏移，减少幅度
            const blueOffset = baseOffset + Math.sin(i / 50) * 0.2; // 蓝色偏移，减少幅度

            // 绘制红色扫描线
            ctx.fillStyle = `rgba(255, 0, 0, 0.08)`; // 降低透明度
            ctx.fillRect(0, (i + redOffset) % canvas.height, canvas.width, 1);
            
            // 绘制绿色扫描线
            ctx.fillStyle = `rgba(0, 255, 0, 0.08)`; // 降低透明度
            ctx.fillRect(0, (i + greenOffset) % canvas.height, canvas.width, 1);
            
            // 绘制蓝色扫描线
            ctx.fillStyle = `rgba(0, 0, 255, 0.08)`; // 降低透明度
            ctx.fillRect(0, (i + blueOffset) % canvas.height, canvas.width, 1);
        }
    }

    // 启动绘制函数
    function startCRT() {
        drawCRT();
    }

    // 切换效果的函数
    function toggleEffect() {
        isEffectEnabled = !isEffectEnabled; // 切换状态
        if (isEffectEnabled) {
            startCRT(); // 如果启用，则重新启动绘制
        } else {
            // 如果效果关闭，清除画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // 监听复选框状态变更
    const checkbox = document.getElementById('crtToggle');
    checkbox.addEventListener('change', () => {
        isEffectEnabled = checkbox.checked; // 更新状态
        if (isEffectEnabled) {
            startCRT(); // 如果启用，则重新启动绘制
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布内容
        }
    });

    // 添加事件监听器以处理窗口加载和调整大小的事件
    window.addEventListener('load', startCRT);
    window.addEventListener('resize', startCRT);
}
