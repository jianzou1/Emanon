// crtEffect.js
const CONFIG = {
    CANVAS_CLASS: 'crt-effect',
    CHECKBOX_ID: 'crtToggle',
    STORAGE_KEY: 'crtEffectEnabled',
    SCAN_LINE: {
        INTERVAL: 4,
        SPEED: 0.06,
        COLORS: [
            'rgba(255, 0, 0, 0.08)',
            'rgba(0, 255, 0, 0.08)',
            'rgba(0, 0, 255, 0.08)'
        ],
        OSCILLATION: {
            FREQ: 50,
            AMP: 0.2
        }
    }
};

export function initCRT() {
    // ==== 核心元素初始化 ====
    const canvas = document.querySelector(`.${CONFIG.CANVAS_CLASS}`);
    if (!canvas) {
        console.error('[CRT] 需要.crt-effect画布元素');
        return;
    }

    const ctx = canvas.getContext('2d');
    let isEffectEnabled = true;
    let animationId = null;
    let checkbox = null;

    // ==== 动画核心逻辑 ====
    let offset = 0;
    
    const render = () => {
        if (!isEffectEnabled) return;
        
        // 智能尺寸同步
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 扫描线绘制
        for (let y = 0; y < canvas.height; y += CONFIG.SCAN_LINE.INTERVAL) {
            const baseOffset = offset % CONFIG.SCAN_LINE.INTERVAL;
            
            CONFIG.SCAN_LINE.COLORS.forEach((color, idx) => {
                const lineOffset = baseOffset + 
                    Math.sin(y / CONFIG.SCAN_LINE.OSCILLATION.FREQ) * CONFIG.SCAN_LINE.OSCILLATION.AMP +
                    idx * 0.3;
                
                ctx.fillStyle = color;
                ctx.fillRect(
                    0, 
                    (y + lineOffset) % canvas.height,
                    canvas.width,
                    1
                );
            });
        }

        offset += CONFIG.SCAN_LINE.SPEED;
        animationId = requestAnimationFrame(render);
    };

    const stopEffect = () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // ==== 状态存储 ====
    const loadSettings = () => {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.warn('[CRT] 配置读取失败，使用默认值');
            return true;
        }
    };

    const saveSettings = (enabled) => {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(enabled));
        } catch (error) {
            console.error('[CRT] 配置保存失败:', error);
        }
    };

    // ==== 复选框控制 ====
    const handleCheckboxChange = (e) => {
        const newState = e.target.checked;
        if (newState === isEffectEnabled) return;
        
        isEffectEnabled = newState;
        saveSettings(newState);
        
        newState ? render() : stopEffect();
    };

    const bindController = (element) => {
        // 清理旧绑定
        if (checkbox) {
            checkbox.removeEventListener('change', handleCheckboxChange);
        }

        // 新元素绑定
        if (element && element.nodeType === Node.ELEMENT_NODE) {
            checkbox = element;
            checkbox.addEventListener('change', handleCheckboxChange);
            checkbox.checked = isEffectEnabled;
            return true;
        }
        return false;
    };

    // ==== 初始化流程 ====
    const initialize = () => {
        // 加载设置
        isEffectEnabled = loadSettings();
        
        // 尝试自动绑定
        const autoBindElement = document.getElementById(CONFIG.CHECKBOX_ID);
        if (autoBindElement) {
            bindController(autoBindElement);
        }
        
        // 启动效果
        if (isEffectEnabled) render();
        
        // 窗口响应
        window.addEventListener('resize', () => {
            if (isEffectEnabled) render();
        }, { passive: true });
    };

    // ==== 安全启动 ====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }

    // ==== 公共API ====
    return {
        enable: () => {
            if (isEffectEnabled) return;
            isEffectEnabled = true;
            saveSettings(true);
            if (checkbox) checkbox.checked = true;
            render();
        },
        disable: () => {
            if (!isEffectEnabled) return;
            isEffectEnabled = false;
            saveSettings(false);
            if (checkbox) checkbox.checked = false;
            stopEffect();
        },
        attachController: (element) => {
            return bindController(element || document.getElementById(CONFIG.CHECKBOX_ID));
        },
        hasController: () => !!checkbox
    };
}