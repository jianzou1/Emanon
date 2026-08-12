// crtEffect.js
// CRT 叠加层 — WebGL 片元着色器实现（高分辨率下 Canvas 2D 光栅化瓶颈，改用 GPU 并行）

const CONFIG = {
    CANVAS_CLASS: 'crt-effect',
    CHECKBOX_ID: 'crtToggle',
    STORAGE_KEY: 'crtEffectEnabled',
    VISUAL: {
        BACKGROUND_ALPHA: 0.05,
        SCAN_LINE: {
            INTERVAL: 4.2,
            SPEED: 0.06,
            LINE_WIDTH: 1.1,
            COLORS: [
                'rgba(255, 0, 0, 0.08)',
                'rgba(0, 255, 0, 0.08)',
                'rgba(0, 0, 255, 0.08)'
            ],
            OSCILLATION: { FREQ: 50, AMP: 0.2 }
        },
        BARREL_DISTORTION: {
            ENABLED: true,
            EDGE_COMPRESS: 0.1,
            CURVE_STRENGTH: 0.05,
            POWER: 1.7,
            OVERSCAN: 0.04
        },
        EDGE_VIGNETTE: {
            ENABLED: true,
            HEIGHT_RATIO: 0.12,
            ALPHA: 0.11,
            FLICKER_DEPTH: 0.04
        },
        CORNER_DISTORTION: {
            ENABLED: true,
            RADIUS_RATIO: 0.22,
            SHADOW_ALPHA: 0.22,
            HIGHLIGHT_ALPHA: 0.12,
            CHROMA_OFFSET: 0.015,
            FLICKER_SPEED: 0.035,
            FLICKER_DEPTH: 0.07,
            CENTER_OFFSET_RATIO: 0.28,
            SOFT_EDGE_RATIO: 1.28
        }
    }
};

// 扫描线 alpha（从 COLORS[0] 解析，三通道相同）
const SCAN_ALPHA = 0.08;

// GLSL float 字面量转换（整数加 .0，避免 #define 50 被解析为 int 导致 float/int 类型错误）
const glslF = (n) => Number.isInteger(n) ? n + '.0' : String(n);

// ==== 着色器源码（从 CONFIG 注入常量）====
const VERT_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_scanOffset;
uniform float u_phase;

#define INTERVAL ${glslF(CONFIG.VISUAL.SCAN_LINE.INTERVAL)}
#define LINE_WIDTH ${glslF(CONFIG.VISUAL.SCAN_LINE.LINE_WIDTH)}
#define FREQ ${glslF(CONFIG.VISUAL.SCAN_LINE.OSCILLATION.FREQ)}
#define AMP ${glslF(CONFIG.VISUAL.SCAN_LINE.OSCILLATION.AMP)}
#define EDGE_COMPRESS ${glslF(CONFIG.VISUAL.BARREL_DISTORTION.EDGE_COMPRESS)}
#define CURVE_STRENGTH ${glslF(CONFIG.VISUAL.BARREL_DISTORTION.CURVE_STRENGTH)}
#define POWER ${glslF(CONFIG.VISUAL.BARREL_DISTORTION.POWER)}
#define OVERSCAN ${glslF(CONFIG.VISUAL.BARREL_DISTORTION.OVERSCAN)}
#define BG_ALPHA ${glslF(CONFIG.VISUAL.BACKGROUND_ALPHA)}
#define SCAN_ALPHA ${glslF(SCAN_ALPHA)}
#define VIG_HEIGHT ${glslF(CONFIG.VISUAL.EDGE_VIGNETTE.HEIGHT_RATIO)}
#define VIG_ALPHA ${glslF(CONFIG.VISUAL.EDGE_VIGNETTE.ALPHA)}
#define VIG_FLICKER ${glslF(CONFIG.VISUAL.EDGE_VIGNETTE.FLICKER_DEPTH)}
#define CORNER_RADIUS ${glslF(CONFIG.VISUAL.CORNER_DISTORTION.RADIUS_RATIO)}
#define CORNER_SHADOW ${glslF(CONFIG.VISUAL.CORNER_DISTORTION.SHADOW_ALPHA)}
#define CORNER_HL ${glslF(CONFIG.VISUAL.CORNER_DISTORTION.HIGHLIGHT_ALPHA)}
#define CHROMA_OFFSET ${glslF(CONFIG.VISUAL.CORNER_DISTORTION.CHROMA_OFFSET)}
#define CORNER_FLICKER ${glslF(CONFIG.VISUAL.CORNER_DISTORTION.FLICKER_DEPTH)}
#define CENTER_OFFSET ${glslF(CONFIG.VISUAL.CORNER_DISTORTION.CENTER_OFFSET_RATIO)}
#define SOFT_EDGE ${glslF(CONFIG.VISUAL.CORNER_DISTORTION.SOFT_EDGE_RATIO)}

// 直线扫描线 alpha（已做桶形畸变 Y 补偿）
float scanlineAlpha(float y, float offset) {
    float wave = sin(y / FREQ) * AMP;
    float pos = mod(y + offset + wave, INTERVAL);
    float dist = min(pos, INTERVAL - pos);
    return SCAN_ALPHA * (1.0 - smoothstep(0.0, LINE_WIDTH * 0.5, dist));
}

// 暗角渐变（复刻 Canvas2D stops: 0→1, 0.24→0.62, 0.58→0.21, 1→0）
float vigCurve(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.24) return mix(1.0, 0.62, t / 0.24);
    if (t < 0.58) return mix(0.62, 0.21, (t - 0.24) / 0.34);
    return mix(0.21, 0.0, (t - 0.58) / 0.42);
}

// 四角阴影渐变（stops: 0→0.55, 0.22→0.35, 0.5→0.14, 0.78→0.03, 1→0）
float cornerShadowCurve(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.22) return mix(0.55, 0.35, t / 0.22);
    if (t < 0.5)  return mix(0.35, 0.14, (t - 0.22) / 0.28);
    if (t < 0.78) return mix(0.14, 0.03, (t - 0.5) / 0.28);
    return mix(0.03, 0.0, (t - 0.78) / 0.22);
}

// 四角高光渐变（stops: 0→0.65, 0.35→0.22, 0.7→0.02, 1→0）
float cornerHlCurve(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.35) return mix(0.65, 0.22, t / 0.35);
    if (t < 0.7)  return mix(0.22, 0.02, (t - 0.35) / 0.35);
    return mix(0.02, 0.0, (t - 0.7) / 0.3);
}

void main() {
    float w = u_resolution.x;
    float h = u_resolution.y;
    float px = v_uv.x * w;
    float py = v_uv.y * h;

    // ==== 桶形畸变 Y 补偿：把弯曲扫描线拉直 ====
    float normalizedY = (py / h) * 2.0 - 1.0;
    float absN = abs(normalizedY);
    float intensity = pow(absN, POWER);
    float xInset = w * EDGE_COMPRESS * intensity;
    float overscan = w * OVERSCAN;
    float bowOffset = h * CURVE_STRENGTH * normalizedY * intensity;
    float startX = -overscan - xInset;
    float endX = w + overscan + xInset;
    float t = clamp((px - startX) / (endX - startX), 0.0, 1.0);
    float bowY = 4.0 * t * (1.0 - t) * bowOffset;
    float pyComp = py - bowY;

    // ==== 背景 + 扫描线（模拟 bg→R→G→B source-over，非 premultiplied）====
    float a = BG_ALPHA;
    float cr = 0.0, cg = 0.0, cb = 0.0;
    bool inScanRange = (endX > startX) && (px > startX) && (px < endX);
    if (inScanRange) {
        float aR = scanlineAlpha(pyComp, u_scanOffset + 0.0);
        float aG = scanlineAlpha(pyComp, u_scanOffset + 0.3);
        float aB = scanlineAlpha(pyComp, u_scanOffset + 0.6);
        // +R
        cr = aR + cr * (1.0 - aR);
        a = aR + a * (1.0 - aR);
        // +G
        cr = 0.0 * aG + cr * (1.0 - aG);
        cg = aG + cg * (1.0 - aG);
        a = aG + a * (1.0 - aG);
        // +B
        cr = 0.0 * aB + cr * (1.0 - aB);
        cg = 0.0 * aB + cg * (1.0 - aB);
        cb = aB;
        a = aB + a * (1.0 - aB);
    }

    // ==== 暗角（multiply 黑色 → rgb *= (1-vignette)）====
    float vigFlicker = 1.0 + sin(u_phase * 0.82 + 1.1) * VIG_FLICKER;
    float vigA = VIG_ALPHA * vigFlicker;
    float edgeH = max(14.0, h * VIG_HEIGHT);
    float topT = py / edgeH;
    float botT = (h - py) / edgeH;
    float vig = vigA * max(vigCurve(topT), vigCurve(botT));
    cr *= (1.0 - vig);
    cg *= (1.0 - vig);
    cb *= (1.0 - vig);

    // ==== 四角畸变 ====
    float minSize = min(w, h);
    float radius = minSize * CORNER_RADIUS;
    float cFlicker = 1.0 + sin(u_phase) * CORNER_FLICKER;
    float centerOff = radius * CENTER_OFFSET;
    float edgeR = radius * SOFT_EDGE;
    float chromaOff = radius * CHROMA_OFFSET;

    float shadowAcc = 0.0;
    float hlAcc = 0.0;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float sx = (mod(fi, 2.0) > 0.5) ? 1.0 : -1.0;
        float sy = (fi >= 1.5) ? 1.0 : -1.0;
        float cx = sx < 0.0 ? 0.0 : w;
        float cy = sy < 0.0 ? 0.0 : h;
        // 阴影中心在画布外
        float ox = cx + sx * centerOff;
        float oy = cy + sy * centerOff;
        float d = distance(vec2(px, py), vec2(ox, oy));
        float ts = d / edgeR;
        if (ts < 1.0) {
            shadowAcc = max(shadowAcc, cornerShadowCurve(ts) * CORNER_SHADOW * cFlicker);
        }
        // 色差高光中心反向偏移
        float hox = cx - sx * chromaOff;
        float hoy = cy - sy * chromaOff;
        float dh = distance(vec2(px, py), vec2(hox, hoy));
        float th = dh / (edgeR * 0.9);
        if (th < 1.0) {
            hlAcc = max(hlAcc, cornerHlCurve(th) * CORNER_HL * cFlicker);
        }
    }
    // 四角阴影 multiply
    cr *= (1.0 - shadowAcc);
    cg *= (1.0 - shadowAcc);
    cb *= (1.0 - shadowAcc);
    // 四角高光 source-over 蓝光 rgba(120,180,255,hl)
    float hlR = 120.0 / 255.0;
    float hlG = 180.0 / 255.0;
    float hlB = 255.0 / 255.0;
    cr = hlR * hlAcc + cr * (1.0 - hlAcc);
    cg = hlG * hlAcc + cg * (1.0 - hlAcc);
    cb = hlB * hlAcc + cb * (1.0 - hlAcc);
    a = hlAcc + a * (1.0 - hlAcc);

    gl_FragColor = vec4(cr, cg, cb, a);
}
`;

// ==== WebGL 工具 ====
function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('[CRT] Shader compile error:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
    }
    return sh;
}

function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('[CRT] Program link error:', gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return null;
    }
    return prog;
}

// 单例控制器
let instance = null;

export function initCRT() {
    if (instance) return instance;

    const canvas = document.querySelector(`.${CONFIG.CANVAS_CLASS}`);
    if (!canvas) {
        console.warn('[CRT] Canvas element not found');
        return null;
    }

    const gl = canvas.getContext('webgl', {
        premultipliedAlpha: false,
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false
    }) || canvas.getContext('experimental-webgl', {
        premultipliedAlpha: false,
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false
    });

    if (!gl) {
        console.warn('[CRT] WebGL not supported, CRT effect disabled');
        return null;
    }

    const program = createProgram(gl, VERT_SRC, FRAG_SRC);
    if (!program) return null;

    // 全屏四边形
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uScanOffset = gl.getUniformLocation(program, 'u_scanOffset');
    const uPhase = gl.getUniformLocation(program, 'u_phase');

    const VISUAL = CONFIG.VISUAL;
    const SCAN_LINE = VISUAL.SCAN_LINE;
    const CORNER = VISUAL.CORNER_DISTORTION;

    let isEffectEnabled = true;
    let animationId = null;
    let isAnimating = false;
    let checkbox = null;
    let observer = null;
    let scanOffset = 0;
    let distortionPhase = 0;

    const eventRegistry = {
        resize: { handler: null, target: window },
        domReady: { handler: null, target: document },
        checkbox: { handler: null, target: null }
    };

    const resizeCanvas = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        if (canvas.width === width && canvas.height === height) return false;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        return true;
    };

    const renderFrame = () => {
        if (!isEffectEnabled) {
            isAnimating = false;
            return;
        }
        resizeCanvas();

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uScanOffset, scanOffset);
        gl.uniform1f(uPhase, distortionPhase);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        scanOffset += SCAN_LINE.SPEED;
        distortionPhase += CORNER.FLICKER_SPEED;
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
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
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
            if (newState) startAnimation();
            else stopAnimation();
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
        observer.observe(document.body, { childList: true, subtree: true, attributeFilter: ['id'] });
    };

    // ==== 事件管理 ====
    const initEventListeners = () => {
        eventRegistry.resize.handler = () => {
            if (!isEffectEnabled) return;
            resizeCanvas();
        };
        eventRegistry.resize.target.addEventListener('resize', eventRegistry.resize.handler, { passive: true });

        if (document.readyState === 'loading') {
            eventRegistry.domReady.handler = initialize;
            eventRegistry.domReady.target.addEventListener('DOMContentLoaded', eventRegistry.domReady.handler, { once: true });
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

    // ==== 初始化 ====
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

    // ==== 清理 ====
    const cleanup = () => {
        stopAnimation();
        removeEventListeners();
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        checkbox = null;
        if (quadBuf) gl.deleteBuffer(quadBuf);
        if (program) gl.deleteProgram(program);
        instance = null;
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
            cleanup();
        }
    };

    initEventListeners();
    instance = api;
    return api;
}
