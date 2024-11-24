// crtEffect.js

// 导出 initCRT 函数以供其他模块使用
export function initCRT() {
    // 查找画布元素
    const canvas = document.querySelector('.crt-effect');
    if (!canvas) {
        console.error('CRT canvas not found');
        return;
    }

    // 获取绘图上下文
    const ctx = canvas.getContext('2d');
    let offset = 0; // 控制扫描线的偏移量
    const speed = 0.5; // 控制扫描线移动的速度

    // 定义绘制 CRT 效果的函数
    function drawCRT() {
        // 设置画布的宽度和高度为窗口的宽度和高度
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 填充一个半透明的黑色矩形作为滤镜背景
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 设置扫描线的颜色和透明度
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';

        // 在画布上绘制动态扫描线
        for (let i = 0; i < canvas.height; i += 4) {
            // 每隔4像素绘制一条线，线条根据偏移量动态下移
            ctx.fillRect(0, (i + offset) % canvas.height, canvas.width, 1);
        }

        // 更新偏移量，以创建动态效果
        offset = (offset + speed) % 4; // 当偏移量达到4时重置
        requestAnimationFrame(drawCRT); // 请求下一帧的绘制
    }

    // 启动绘制函数
    function startCRT() {
        drawCRT();
    }

    // 添加事件监听器以处理窗口加载和调整大小的事件
    window.addEventListener('load', startCRT);
    window.addEventListener('resize', startCRT);
}
