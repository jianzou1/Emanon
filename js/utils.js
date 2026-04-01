// utils.js — 公共工具函数

/**
 * HTML 转义：防止 XSS 注入
 * 将 & < > " ' 替换为对应的 HTML 实体
 */
export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML 属性值转义：在 escHtml 基础上额外转义反引号
 */
export function escAttr(str) {
  return escHtml(str).replace(/`/g, '&#96;');
}

/**
 * 从 system_cfg 数据中按 id 获取 value
 * @param {Array} systemData - system_cfg.json 解析后的数组
 * @param {string} id - 配置项 id
 * @returns {string} 对应 value 或空字符串
 */
export function getSystemValue(systemData, id) {
  if (!Array.isArray(systemData)) return '';
  return systemData.find(item => item.id === id)?.value || '';
}

/** 语言代码 → JSON 字段后缀映射 */
const LANG_SUFFIX = { en: '_en', jp: '_jp' };

/**
 * 从对象中读取多语言字段
 * 优先读 field_{lang}（如 name_en），无则 fallback 到原始字段（中文）
 * @param {Object} obj - 数据对象
 * @param {string} field - 字段名
 * @param {string} lang - 当前语言代码（如 'en', 'jp', 'zh'）
 * @returns {string}
 */
export function getLocalizedField(obj, field, lang) {
  if (!obj) return '';
  const suffix = LANG_SUFFIX[lang];
  if (suffix) {
    const localized = obj[field + suffix];
    if (localized) return localized;
  }
  return obj[field] || '';
}

/**
 * 标准化游戏数据格式
 * 兼容 [对象数组] 和 [headers, 数据数组] 两种格式
 * @param {*} data - JSON 解析后的数据
 * @returns {Array} 游戏对象数组
 */
export function normalizeGameData(data) {
  if (Array.isArray(data)) {
    if (data[0] && typeof data[0] === 'object' && 'name' in data[0]) return data;
    if (Array.isArray(data[1])) return data[1];
  }
  return [];
}

/**
 * 从 "6:大师之作,5:奇佳,4:卓越" 格式字符串中提取有序 key 数组 ['6','5','4',...]
 * 显示名称通过 langManager.translate() 获取，此处仅提取 key
 * @param {string} str - 配置字符串
 * @returns {string[]} key 数组
 */
export function parseKeys(str) {
  if (!str) return [];
  return str.split(',').map(item => item.trim().split(':')[0].trim());
}

/**
 * 解析格式为 "1:value1,2:value2" 的字符串为 {key: value} 对象
 * @param {string} str - 配置字符串
 * @returns {Object} key-value 对象
 */
export function parseConfigString(str) {
  const result = {};
  if (!str) return result;
  const pairs = str.split(',');
  pairs.forEach(pair => {
    const [key, val] = pair.split(':');
    if (key && val) {
      result[key.trim()] = val.trim();
    }
  });
  return result;
}

/**
 * Fisher-Yates 洗牌算法（原地修改）
 * @param {Array} array - 待洗牌数组
 * @returns {Array} 同一数组引用（已洗牌）
 */
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
