// crtEffect.js

/**
 * CRT效果系统 (优化版)
 * 优化点：
 * 1. 增强性能：限制MutationObserver监听范围
 * 2. 改进内存管理：规范资源回收
 * 3. 提升安全性：完善错误边界处理
 * 4. 增强可维护性：拆分功能模块
 */

// 配置常量集中管理
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
    let checkbox = null;
    let observer = null;

    // ==== 动画核心逻辑 ====
    let offset = 0;
    
    const render = () => {
        if (!isEffectEnabled) return;
        
        // 尺寸同步
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 扫描线绘制优化
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
            // 恢复初始状态
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // ==== 状态存储模块 ====
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

    // ==== 复选框控制模块 ====
    const handleCheckboxChange = (e) => {
        const newState = e.target.checked;
        if (newState === isEffectEnabled) return;
        
        isEffectEnabled = newState;
        saveSettings(newState);
        
        if (newState) {
            render();
        } else {
            stopEffect();
        }
    };

    const bindCheckbox = () => {
        if (!checkbox) return;
        
        // 清理旧监听器
        checkbox.removeEventListener('change', handleCheckboxChange);
        checkbox.addEventListener('change', handleCheckboxChange);
        checkbox.checked = isEffectEnabled;  // 状态同步
    };

    // ==== DOM观察器模块 ====
    const initObserver = () => {
        if (observer) return;

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const nodes = mutation.addedNodes;
                    for (const node of nodes) {
                        if (node.id === CONFIG.CHECKBOX_ID || 
                            node.contains?.(document.getElementById(CONFIG.CHECKBOX_ID))) {
                            setupCheckbox();
                            return; // 找到后立即停止
                        }
                    }
                }
            }
        });

        // 智能观察配置：
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributeFilter: ['id'] // 仅在添加节点或修改id时触发
        });
    };

    const disconnectObserver = () => {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    };

    // ==== 核心初始化流程 ====
    const setupCheckbox = () => {
        checkbox = document.getElementById(CONFIG.CHECKBOX_ID);
        if (!checkbox) return;
        
        bindCheckbox();
        disconnectObserver(); // 找到后停止观察
        console.log('[CRT] Checkbox initialized');
    };

    const initialize = () => {
        // 加载初始状态
        isEffectEnabled = loadSettings();
        
        // 初始化复选框
        setupCheckbox();
        
        // 启动后备观察机制
        if (!checkbox) {
            console.warn('[CRT] Checkbox not found, starting observer');
            initObserver();
        }
        
        // 初始渲染
        if (isEffectEnabled) render();
        
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
                // 避免触发多余渲染
                requestAnimationFrame(render);
            } else {
                render();
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
            disconnectObserver();
            if (checkbox) {
                checkbox.removeEventListener('change', handleCheckboxChange);
            }
            window.removeEventListener('resize', render);
            window.removeEventListener('DOMContentLoaded', initialize);
            console.log('[CRT] System destroyed');
        }
    };
}