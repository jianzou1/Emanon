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
    // ==== 初始化核心元素 ====
    const canvas = document.querySelector(`.${CONFIG.CANVAS_CLASS}`);
    if (!canvas) {
        console.error('[CRT] Canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    let isEffectEnabled = true;
    let animationId = null;
    let checkbox = document.getElementById(CONFIG.CHECKBOX_ID);

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

        // 高性能扫描线绘制
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

    // ==== 状态管理模块 ====
    const loadSettings = () => {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.warn('[CRT] Failed to load settings:', error);
            return true;
        }
    };

    const saveSettings = (enabled) => {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(enabled));
        } catch (error) {
            console.error('[CRT] Failed to save settings:', error);
        }
    };

    // ==== 控件绑定模块 ====
    const handleCheckboxChange = (e) => {
        const newState = e.target.checked;
        if (newState === isEffectEnabled) return;
        
        isEffectEnabled = newState;
        saveSettings(newState);
        
        newState ? render() : stopEffect();
    };

    const bindCheckbox = () => {
        if (!checkbox) {
            console.warn('[CRT] Checkbox not found');
            return;
        }
        
        checkbox.removeEventListener('change', handleCheckboxChange);
        checkbox.addEventListener('change', handleCheckboxChange);
        checkbox.checked = isEffectEnabled;
    };

    // ==== 初始化流程 ====
    const initialize = () => {
        // 加载初始状态
        isEffectEnabled = loadSettings();
        
        // 绑定复选框控件
        bindCheckbox();
        
        // 初始渲染控制
        isEffectEnabled ? render() : stopEffect();
        
        // 响应式处理
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
            if (checkbox) {
                checkbox.checked = true;
                requestAnimationFrame(render);
            }
        },
        disable: () => {
            if (!isEffectEnabled) return;
            isEffectEnabled = false;
            saveSettings(false);
            if (checkbox) checkbox.checked = false;
            stopEffect();
        },
        destroy: () => {
            stopEffect();
            if (checkbox) {
                checkbox.removeEventListener('change', handleCheckboxChange);
            }
            window.removeEventListener('resize', render);
            window.removeEventListener('DOMContentLoaded', initialize);
            console.log('[CRT] System destroyed');
        }
    };
}