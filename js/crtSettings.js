// crtSettings.js — CRT 效果的三档预设 / 持久化 / 订阅
// 只对外暴露「正常 / 轻微 / 关闭」，具体参数在内部定义；渲染层订阅后即时应用

/**
 * 预设参数（键名直接对应 crtEffect.js 的着色器 uniform）
 * normal 就是原始画面，改这里等于改默认观感
 */
export const CRT_PRESETS = {
  normal: {
    scanAlpha: 0.08,
    interval: 4.2,
    speed: 0.06,
    curve: 0.05,
    vignette: 0.11,
    chroma: 0.015,
    flicker: 1,
  },
  light: {
    scanAlpha: 0.05,
    interval: 4.2,
    speed: 0.04,
    curve: 0.03,
    vignette: 0.06,
    chroma: 0.008,
    flicker: 0.5,
  },
};

// 顺序即弹窗里的显示顺序
export const CRT_LEVELS = ['normal', 'light', 'off'];

const STORAGE_KEY = 'crtEffectSettings';
const LEGACY_KEY = 'crtEffectEnabled';

const isLevel = (value) => CRT_LEVELS.includes(value);

const persist = (nextLevel) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: nextLevel }));
  } catch (error) {
    console.warn('[CRT] settings save error:', error);
  }
};

const readLevel = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && isLevel(parsed.level)) return parsed.level;
      // 上一版存的是 { enabled, params }，映射成档位
      if (parsed && typeof parsed.enabled === 'boolean') return parsed.enabled ? 'normal' : 'off';
    }
    // 更早的版本只存了一个布尔值
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) return legacy === 'false' ? 'off' : 'normal';
  } catch (error) {
    console.warn('[CRT] settings read error:', error);
  }
  return 'normal';
};

let level = readLevel();
const listeners = new Set();

/**
 * 当前档位
 * @returns {'normal'|'light'|'off'}
 */
export function getCrtLevel() {
  return level;
}

/**
 * 当前档位对应的渲染参数（关闭时 params 仍是 normal 的值，enabled 为 false）
 * @returns {{ enabled: boolean, level: string, params: Record<string, number> }}
 */
export function getCrtSettings() {
  const preset = CRT_PRESETS[level] || CRT_PRESETS.normal;
  return {
    enabled: level !== 'off',
    level,
    params: { ...preset },
  };
}

/**
 * 切换档位（非法值忽略）
 * @param {'normal'|'light'|'off'} next
 */
export function setCrtLevel(next) {
  if (!isLevel(next) || next === level) return;
  const prev = getCrtSettings();
  level = next;
  persist(level);
  const current = getCrtSettings();
  listeners.forEach((fn) => fn(current, prev));
}

/**
 * 订阅档位变化
 * @param {(next: ReturnType<typeof getCrtSettings>, prev: ReturnType<typeof getCrtSettings>) => void} fn
 * @returns {() => void} 取消订阅
 */
export function subscribeCrtSettings(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}
