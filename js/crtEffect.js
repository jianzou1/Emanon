// crtEffect.js

// 导出 initCRT 函数以供其他模块使用
export function initCRT() {
    const canvas = document.querySelector('.crt-effect');
    if (!canvas) {
        console.error('CRT canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    const speed = 0.06;
    let offset = 0; 
    let isEffectEnabled = false; // 初始设为 false，等待复选框状态确定
    let animationId = null;

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
        if (!isEffectEnabled) {
            cancelAnimationFrame(animationId);
            return;
        }

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        clearCanvas();
        drawScanLines();
        
        offset += speed;
        animationId = requestAnimationFrame(drawCRT); 
    }

    // 切换效果的函数
    function toggleEffect() {
        isEffectEnabled = !isEffectEnabled;
        if (isEffectEnabled) {
            drawCRT();
        } else {
            clearCanvas();
            cancelAnimationFrame(animationId);
        }
    }

    // 初始化函数
    function initialize() {
        const checkbox = document.getElementById('crtToggle');
        if (!checkbox) {
            console.error('CRT toggle checkbox not found');
            return;
        }

        // 设置初始状态
        isEffectEnabled = checkbox.checked;
        
        // 添加事件监听器
        checkbox.addEventListener('change', toggleEffect);
        
        // 根据初始状态启动或禁用效果
        if (isEffectEnabled) {
            drawCRT();
        }

        // 处理窗口大小变化
        window.addEventListener('resize', () => {
            if (isEffectEnabled) {
                drawCRT();
            }
        });
    }

    // 使用 DOMContentLoaded 而不是 load 事件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM 已经加载完成
        initialize();
    }
}