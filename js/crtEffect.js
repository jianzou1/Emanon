// crtEffect.js


const CONFIG = {
    CANVAS_CLASS: 'crt-effect', // CRT 叠加层 canvas 的类名
    CHECKBOX_ID: 'crtToggle', // 控制 CRT 开关的复选框 ID
    STORAGE_KEY: 'crtEffectEnabled', // 本地存储中保存开关状态的键名
    VISUAL: {
        BACKGROUND_ALPHA: 0.05, // 全局底色遮罩透明度（越大越暗）
        SCAN_LINE: {
            INTERVAL: 4.2, // 扫描线之间的垂直间距（px）
            SPEED: 0.06, // 扫描线纵向滚动速度
            LINE_WIDTH: 1.1, // 扫描线绘制线宽
            COLORS: [
                'rgba(255, 0, 0, 0.08)', // 红色通道叠加
                'rgba(0, 255, 0, 0.08)', // 绿色通道叠加
                'rgba(0, 0, 255, 0.08)' // 蓝色通道叠加
            ],
            OSCILLATION: {
                FREQ: 50, // 正弦扰动频率（值越小起伏越密）
                AMP: 0.2 // 正弦扰动振幅（扫描线抖动强度）
            }
        },
        BARREL_DISTORTION: {
            ENABLED: true, // 是否启用桶形畸变
            EDGE_COMPRESS: 0.1, // 上下边缘横向收缩比例
            CURVE_STRENGTH: 0.05, // 扫描线弯曲强度
            POWER: 1.7, // 畸变分布指数（越大越集中到边缘）
            OVERSCAN: 0.04 // 过扫描扩展比例，避免边缘漏绘
        },
        EDGE_VIGNETTE: {
            ENABLED: true, // 是否启用上下弱暗角
            HEIGHT_RATIO: 0.12, // 上下暗角高度占屏幕比例
            ALPHA: 0.11, // 上下暗角基准透明度
            FLICKER_DEPTH: 0.04 // 上下暗角闪烁幅度
        },
        CORNER_DISTORTION: {
            ENABLED: true, // 是否启用四角畸变层
            RADIUS_RATIO: 0.22, // 四角畸变半径占短边比例
            SHADOW_ALPHA: 0.22, // 四角阴影强度
            HIGHLIGHT_ALPHA: 0.12, // 四角高光强度
            CHROMA_OFFSET: 0.015, // 色偏高光偏移量
            FLICKER_SPEED: 0.035, // 四角闪烁相位推进速度
            FLICKER_DEPTH: 0.07, // 四角闪烁幅度
            CENTER_OFFSET_RATIO: 0.28, // 阴影中心向画布外偏移比例
            SOFT_EDGE_RATIO: 1.28 // 四角阴影软边扩散比例
        }
    }
};

// 单例控制器
let instance = null;
let instanceCount = 0;

export function initCRT() {
    if (instance) {
        instanceCount++;
        console.info(`[CRT] Using existing instance (count: ${instanceCount})`);
        return instance;
    }

    // ==== 核心元素 ====
    const canvas = document.querySelector(`.${CONFIG.CANVAS_CLASS}`);
    if (!canvas) {
        console.warn('[CRT] Canvas element not found');
        return null;
    }

    const ctx = canvas.getContext('2d');
    const VISUAL = CONFIG.VISUAL;
    const SCAN_LINE = VISUAL.SCAN_LINE;
    const BARREL = VISUAL.BARREL_DISTORTION;
    const EDGE_VIGNETTE = VISUAL.EDGE_VIGNETTE;
    const CORNER = VISUAL.CORNER_DISTORTION;

    let isEffectEnabled = true;
    let animationId = null;
    let isAnimating = false;
    let checkbox = null;
    let observer = null;

    // ==== 事件追踪系统 ====
    const eventRegistry = {
        resize: { handler: null, target: window },
        domReady: { handler: null, target: document },
        checkbox: { handler: null, target: null }
    };

    // ==== 动画渲染模块 ====
    let scanOffset = 0;
    let distortionPhase = 0;
    let scanLineRows = [];
    const scanLineColorOffsets = [];
    for (let i = 0; i < SCAN_LINE.COLORS.length; i++) {
        scanLineColorOffsets.push(i * 0.3);
    }

    const buildScanLineRows = () => {
        scanLineRows = [];
        for (let y = 0; y < canvas.height; y += SCAN_LINE.INTERVAL) {
            scanLineRows.push({
                y,
                waveOffset: Math.sin(y / SCAN_LINE.OSCILLATION.FREQ) * SCAN_LINE.OSCILLATION.AMP
            });
        }
    };

    const resizeCanvas = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        if (canvas.width === width && canvas.height === height) return false;
        canvas.width = width;
        canvas.height = height;
        buildScanLineRows();
        return true;
    };

    const cornerSigns = [
        { sx: -1, sy: -1 },
        { sx: 1, sy: -1 },
        { sx: -1, sy: 1 },
        { sx: 1, sy: 1 }
    ];

    const drawCornerDistortion = () => {
        if (!CORNER.ENABLED) return;

        const { width, height } = canvas;
        const minSize = Math.min(width, height);
        const radius = minSize * CORNER.RADIUS_RATIO;
        const flicker = 1 + Math.sin(distortionPhase) * CORNER.FLICKER_DEPTH;
        const centerOffset = radius * CORNER.CENTER_OFFSET_RATIO;
        const edgeRadius = radius * CORNER.SOFT_EDGE_RATIO;

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        for (let i = 0; i < cornerSigns.length; i++) {
            const sign = cornerSigns[i];
            const x = sign.sx < 0 ? 0 : width;
            const y = sign.sy < 0 ? 0 : height;
            const originX = sign.sx < 0 ? -centerOffset : width + centerOffset;
            const originY = sign.sy < 0 ? -centerOffset : height + centerOffset;

            const shadow = ctx.createRadialGradient(originX, originY, radius * 0.02, x, y, edgeRadius);
            shadow.addColorStop(0, `rgba(0, 0, 0, ${CORNER.SHADOW_ALPHA * 0.55 * flicker})`);
            shadow.addColorStop(0.22, `rgba(0, 0, 0, ${CORNER.SHADOW_ALPHA * 0.35 * flicker})`);
            shadow.addColorStop(0.5, `rgba(0, 0, 0, ${CORNER.SHADOW_ALPHA * 0.14 * flicker})`);
            shadow.addColorStop(0.78, 'rgba(0, 0, 0, 0.03)');
            shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = shadow;
            ctx.fillRect(x - edgeRadius, y - edgeRadius, edgeRadius * 2, edgeRadius * 2);
        }
        ctx.restore();

        for (let i = 0; i < cornerSigns.length; i++) {
            const sign = cornerSigns[i];
            const x = sign.sx < 0 ? 0 : width;
            const y = sign.sy < 0 ? 0 : height;
            const chromaOffset = radius * CORNER.CHROMA_OFFSET;
            const chroma = ctx.createRadialGradient(
                x + (sign.sx < 0 ? chromaOffset : -chromaOffset),
                y + (sign.sy < 0 ? chromaOffset : -chromaOffset),
                0,
                x,
                y,
                edgeRadius * 0.9
            );
            chroma.addColorStop(0, `rgba(120, 180, 255, ${CORNER.HIGHLIGHT_ALPHA * 0.65 * flicker})`);
            chroma.addColorStop(0.35, `rgba(100, 145, 230, ${CORNER.HIGHLIGHT_ALPHA * 0.22 * flicker})`);
            chroma.addColorStop(0.7, 'rgba(90, 130, 220, 0.02)');
            chroma.addColorStop(1, 'rgba(90, 130, 220, 0)');

            ctx.fillStyle = chroma;
            ctx.fillRect(x - edgeRadius, y - edgeRadius, edgeRadius * 2, edgeRadius * 2);
        }

        distortionPhase += CORNER.FLICKER_SPEED;
    };

    const drawVerticalEdgeVignette = () => {
        if (!EDGE_VIGNETTE.ENABLED) return;

        const { width, height } = canvas;
        const edgeHeight = Math.max(14, height * EDGE_VIGNETTE.HEIGHT_RATIO);
        const flicker = 1 + Math.sin(distortionPhase * 0.82 + 1.1) * EDGE_VIGNETTE.FLICKER_DEPTH;
        const edgeAlpha = EDGE_VIGNETTE.ALPHA * flicker;

        const topGradient = ctx.createLinearGradient(0, 0, 0, edgeHeight);
        topGradient.addColorStop(0, `rgba(0, 0, 0, ${edgeAlpha})`);
        topGradient.addColorStop(0.24, `rgba(0, 0, 0, ${edgeAlpha * 0.62})`);
        topGradient.addColorStop(0.58, `rgba(0, 0, 0, ${edgeAlpha * 0.21})`);
        topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        const bottomGradient = ctx.createLinearGradient(0, height, 0, height - edgeHeight);
        bottomGradient.addColorStop(0, `rgba(0, 0, 0, ${edgeAlpha})`);
        bottomGradient.addColorStop(0.24, `rgba(0, 0, 0, ${edgeAlpha * 0.62})`);
        bottomGradient.addColorStop(0.58, `rgba(0, 0, 0, ${edgeAlpha * 0.21})`);
        bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, width, edgeHeight);
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, height - edgeHeight, width, edgeHeight);
        ctx.restore();
    };

    const drawScanLine = (y, color) => {
        if (!BARREL.ENABLED) {
            ctx.fillStyle = color;
            ctx.fillRect(0, y, canvas.width, 1);
            return;
        }

        const normalizedY = (y / canvas.height) * 2 - 1;
        const intensity = Math.pow(Math.abs(normalizedY), BARREL.POWER);
        const xInset = canvas.width * BARREL.EDGE_COMPRESS * intensity;
        const overscan = canvas.width * BARREL.OVERSCAN;
        const bowOffset = canvas.height * BARREL.CURVE_STRENGTH * normalizedY * intensity;
        const startX = -overscan - xInset;
        const endX = canvas.width + overscan + xInset;

        if (endX <= startX) return;

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.quadraticCurveTo(canvas.width / 2, y + bowOffset, endX, y);
        ctx.stroke();
    };
    
    const renderFrame = () => {
        if (!isEffectEnabled) {
            isAnimating = false;
            return;
        }

        resizeCanvas();

        // 清除并绘制背景
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(0, 0, 0, ${VISUAL.BACKGROUND_ALPHA})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制扫描线效果
        const baseOffset = scanOffset % SCAN_LINE.INTERVAL;
        const colorCount = scanLineColorOffsets.length;
        ctx.lineWidth = SCAN_LINE.LINE_WIDTH;
        ctx.lineCap = 'butt';
        for (let rowIndex = 0; rowIndex < scanLineRows.length; rowIndex++) {
            const row = scanLineRows[rowIndex];
            for (let index = 0; index < colorCount; index++) {
                const color = SCAN_LINE.COLORS[index];
                const lineOffset = baseOffset + row.waveOffset + scanLineColorOffsets[index];
                const lineY = ((row.y + lineOffset) % canvas.height + canvas.height) % canvas.height;
                drawScanLine(lineY, color);
            }
        }

        drawVerticalEdgeVignette();
        drawCornerDistortion();

        scanOffset += SCAN_LINE.SPEED;
        animationId = requestAnimationFrame(renderFrame);
    };

    const startAnimation = () => {
        if (isAnimating || !isEffectEnabled) return;
        isAnimating = true;
        renderFrame();
    };

    const stopAnimation = () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        isAnimating = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // ==== 状态管理 ====
    const loadSettings = () => {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.warn('[CRT] Settings load error:', error);
            return true;
        }
    };

    const saveSettings = (enabled) => {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(enabled));
        } catch (error) {
            console.error('[CRT] Settings save error:', error);
        }
    };

    // ==== DOM元素管理 ====
    const setupCheckbox = (element) => {
        if (checkbox) return;

        checkbox = element;
        eventRegistry.checkbox.target = checkbox;
        
        eventRegistry.checkbox.handler = (e) => {
            const newState = e.target.checked;
            if (newState === isEffectEnabled) return;
            
            isEffectEnabled = newState;
            saveSettings(newState);
            
            if (newState) {
                startAnimation();
            } else {
                stopAnimation();
            }
        };

        checkbox.addEventListener('change', eventRegistry.checkbox.handler);
        checkbox.checked = isEffectEnabled;
    };

    const initObserver = () => {
        if (observer) return;

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const target = document.getElementById(CONFIG.CHECKBOX_ID);
                    if (target) setupCheckbox(target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributeFilter: ['id']
        });
    };

    // ==== 事件管理 ====
    const initEventListeners = () => {
        // 窗口大小变化事件
        eventRegistry.resize.handler = () => {
            if (!isEffectEnabled) return;
            resizeCanvas();
        };
        eventRegistry.resize.target.addEventListener(
            'resize',
            eventRegistry.resize.handler,
            { passive: true }
        );

        // DOM加载事件
        if (document.readyState === 'loading') {
            eventRegistry.domReady.handler = initialize;
            eventRegistry.domReady.target.addEventListener(
                'DOMContentLoaded',
                eventRegistry.domReady.handler,
                { once: true }
            );
        } else {
            initialize();
        }
    };

    const removeEventListeners = () => {
        Object.values(eventRegistry).forEach(({ target, handler }) => {
            if (target && handler) {
                target.removeEventListener('resize', handler);
                target.removeEventListener('DOMContentLoaded', handler);
                target.removeEventListener('change', handler);
            }
        });
    };

    // ==== 初始化流程 ====
    const initialize = () => {
        isEffectEnabled = loadSettings();
        resizeCanvas();
        
        const existingCheckbox = document.getElementById(CONFIG.CHECKBOX_ID);
        if (existingCheckbox) {
            setupCheckbox(existingCheckbox);
        } else {
            initObserver();
        }

        if (isEffectEnabled) startAnimation();
    };

    // ==== 清理流程 ====
    const cleanup = () => {
        // 1. 停止动画
        stopAnimation();
        
        // 2. 移除事件监听
        removeEventListeners();
        
        // 3. 断开DOM观察
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // 4. 重置引用
        checkbox = null;
        instance = null;
        instanceCount = 0;
    };

    // ==== 公共API ====
    const api = {
        enable() {
            if (isEffectEnabled) return;
            isEffectEnabled = true;
            saveSettings(true);
            if (checkbox) checkbox.checked = true;
            startAnimation();
        },

        disable() {
            if (!isEffectEnabled) return;
            isEffectEnabled = false;
            saveSettings(false);
            if (checkbox) checkbox.checked = false;
            stopAnimation();
        },

        destroy() {
            if (instanceCount > 0) {
                instanceCount--;
                return;
            }
            cleanup();
        }
    };

    // ==== 单例初始化 ====
    initEventListeners();
    instance = api;
    instanceCount = 1;

    return api;
}