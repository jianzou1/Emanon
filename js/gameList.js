// gameList.js
import langManager from '/js/langManager.js';
import { fetchJSON } from '/js/dataCache.js';
import { escHtml, getSystemValue, getLocalizedField, normalizeGameData, parseKeys } from '/js/utils.js';

const GAME_CONFIG_URL = '/cfg/game_time_cfg.json';
const SYSTEM_CONFIG_URL = '/cfg/system_cfg.json';
const GAME_LIST_HTML_CLASS = '.game-list';

// 排序标识符常量（与 EJS radio value 对应，语言无关）
const SORT_QUALITY = 'sort_quality';
const SORT_TYPE = 'sort_type';
const SORT_TIME = 'sort_time';
const DEFAULT_SORT = SORT_QUALITY;

// ── 模块级状态：跨页签切换持久化，避免重复计算 ──
let games = [];
let typeKeys = [];      // ['1','2',...] — 从 system_cfg 解析的类型编号顺序
let qualityKeys = [];   // ['6','5',...] — 从 system_cfg 解析的评级编号顺序
let dataLoaded = false;
let langListenerBound = false; // 语言切换监听标志
let currentSort = DEFAULT_SORT; // 当前排序选项

// ── 排序结果缓存：切换排序选项时命中缓存，避免重复分组/排序 ──
// key 格式：`${sortOption}_${lang}` — 语言切换后自动 miss
const sortCache = new Map();
function invalidateSortCache() { sortCache.clear(); }

export function gameList() {
    if (dataLoaded) {
        renderStats();
        renderSorted(currentSort);
        bindSortRadios();
        bindLangSwitchListener();
        return;
    }
    fetchGameData();
}

async function fetchGameData() {
    try {
        const [gameData, systemData] = await Promise.all([
            fetchJSON(GAME_CONFIG_URL),
            fetchJSON(SYSTEM_CONFIG_URL)
        ]);

        typeKeys = parseKeys(getSystemValue(systemData, 'typeName'));
        qualityKeys = parseKeys(getSystemValue(systemData, 'qualityName'));
        games = normalizeGameData(gameData);
        dataLoaded = true;

        renderStats();
        renderSorted(DEFAULT_SORT);
        bindSortRadios();
        bindLangSwitchListener();
    } catch (error) {
        console.error("Failed to load game data:", error.message);
    }
}

// ── 语言切换监听：清除缓存 + 重渲染 ──

function bindLangSwitchListener() {
    if (langListenerBound) return;
    langListenerBound = true;

    // 监听语言切换器的 change 事件（冒泡阶段，在 langManager 处理之后）
    const switcher = document.getElementById('lang-switcher');
    if (switcher) {
        // 用 MutationObserver 监听 switcher 被替换的情况（langManager 每次 applyTranslations 会 cloneNode）
        // 更可靠的方案：监听 localStorage 变化 or 定期检查
        // 最简方案：在 body 上委托 change 事件
    }

    // 使用 storage 事件不可靠（同页面不触发），改用轮询检测 + 事件委托
    // 最简且可靠：委托 change 事件到 document，过滤 #lang-switcher
    document.addEventListener('change', (e) => {
        if (e.target.id === 'lang-switcher' || e.target.closest('#lang-switcher')) {
            // 语言已经被 langManager 切换，延迟一个微任务确保 langManager 已更新
            Promise.resolve().then(() => {
                invalidateSortCache();
                renderSorted(currentSort);
            });
        }
    });
}

// ── 统计 + 渲染 ──

function renderStats() {
    const totalTime = games.reduce((sum, g) => sum + g.time, 0);
    const totalDays = Math.floor(totalTime / 24);
    const totalYears = (totalTime / 24 / 365).toFixed(2);

    applyParam('total_time', totalTime);
    applyParam('equivalent_days', totalDays);
    applyParam('equivalent_years', totalYears);
}

function applyParam(id, value) {
    const el = document.querySelector(`[data-lang-id="${id}"]`);
    if (!el) return;
    el.dataset.langParams = JSON.stringify([value]);
    langManager.setParams(id, [value]);
}

// ── 排序选项事件 ──
// 每次进入 game 页签都需要重新绑定，因为 Tab 缓存切换会替换整个内容区域 DOM，
// 之前绑定事件的 .select-container 元素已被移除。
// 同时恢复 radio 选中状态与 currentSort 模块变量保持一致。

let currentContainer = null; // 记住当前已绑定事件的 DOM 引用

function bindSortRadios() {
    const container = document.querySelector('.select-container');
    if (!container) return;

    // 如果当前 DOM 中的 container 与上次绑定的是同一个引用，无需重复绑定
    if (container === currentContainer) {
        syncRadioState(container);
        return;
    }

    currentContainer = container;
    container.addEventListener('change', (event) => {
        const radio = event.target.closest('input[name="sort-option"]');
        if (radio) {
            currentSort = radio.value;
            renderSorted(currentSort);
        }
    });

    // 恢复 radio 选中状态（缓存 HTML 中 checked 始终指向默认值，需同步）
    syncRadioState(container);
}

function syncRadioState(container) {
    const target = container.querySelector(`input[name="sort-option"][value="${currentSort}"]`);
    if (target && !target.checked) {
        target.checked = true;
    }
}

// ── 排序 + 渲染（带缓存，按 sort+lang 做 key） ──

function renderSorted(selectedOption) {
    const gameListElement = document.querySelector(GAME_LIST_HTML_CLASS);
    if (!gameListElement) return;

    const lang = langManager.getCurrentLang();
    const cacheKey = `${selectedOption}_${lang}`;

    let html = sortCache.get(cacheKey);
    if (!html) {
        html = buildSortedHtml(selectedOption);
        sortCache.set(cacheKey, html);
    }

    gameListElement.innerHTML = html;

    // 淡入动画：使用 CSS stagger，不需要 setTimeout
    const items = gameListElement.querySelectorAll('.tree-view > li');
    const len = items.length;
    for (let i = 0; i < len; i++) {
        items[i].style.animationDelay = `${i * 20}ms`;
        items[i].classList.add('tree-fade-in');
    }
}

function buildSortedHtml(selectedOption) {
    if (selectedOption === SORT_QUALITY) {
        return generateQualityHtml(sortGamesByQuality());
    }
    if (selectedOption === SORT_TYPE) {
        return generateTypeHtml(groupAndSortGamesByType());
    }
    // SORT_TIME
    const sorted = [...games].sort((a, b) => b.time - a.time);
    return wrapTreeView(sorted.map(createGameListItem).join(''));
}

// ── 分组排序 ──

function sortGamesByQuality() {
    const grouped = Object.create(null);
    for (let i = 0; i < games.length; i++) {
        const key = String(games[i].quality || '0');
        (grouped[key] || (grouped[key] = [])).push(games[i]);
    }

    const orderedGroups = [];
    for (let i = 0; i < qualityKeys.length; i++) {
        const key = qualityKeys[i];
        if (grouped[key]) {
            orderedGroups.push({ key, games: grouped[key].sort((a, b) => b.time - a.time) });
            delete grouped[key];
        }
    }

    // 未定义的评级
    const remaining = Object.keys(grouped);
    remaining.sort((a, b) => b.localeCompare(a));
    for (let i = 0; i < remaining.length; i++) {
        orderedGroups.push({ key: remaining[i], games: grouped[remaining[i]] });
    }
    return orderedGroups;
}

function groupAndSortGamesByType() {
    const grouped = Object.create(null);
    for (let i = 0; i < games.length; i++) {
        const g = games[i];
        const type = g.type;
        const series = g.seriesTag || '__no_series__';
        if (!grouped[type]) grouped[type] = Object.create(null);
        (grouped[type][series] || (grouped[type][series] = [])).push(g);
    }

    // 每个系列内部按时长降序
    const types = Object.keys(grouped);
    for (let t = 0; t < types.length; t++) {
        const seriesMap = grouped[types[t]];
        const seriesKeys = Object.keys(seriesMap);

        for (let s = 0; s < seriesKeys.length; s++) {
            seriesMap[seriesKeys[s]].sort((a, b) => b.time - a.time);
        }

        // 系列之间按最大时长降序（用 reduce 代替 Math.max(...) 防止爆栈）
        seriesKeys.sort((a, b) => {
            return maxTime(seriesMap[b]) - maxTime(seriesMap[a]);
        });

        // 重建有序对象
        const ordered = Object.create(null);
        for (let s = 0; s < seriesKeys.length; s++) {
            ordered[seriesKeys[s]] = seriesMap[seriesKeys[s]];
        }
        grouped[types[t]] = ordered;
    }
    return grouped;
}

function maxTime(arr) {
    let max = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].time > max) max = arr[i].time;
    }
    return max;
}

// ── HTML 生成 ──

function wrapTreeView(innerHtml) {
    return `<ul class="tree-view">${innerHtml}</ul>`;
}

function generateQualityHtml(orderedGroups) {
    const parts = [];
    for (let i = 0; i < orderedGroups.length; i++) {
        const { key, games: groupGames } = orderedGroups[i];
        const title = escHtml(langManager.translate(`game_quality_${key}`));
        const children = groupGames.map(createGameListItem).join('');
        parts.push(`<li><details open><summary>${title}</summary><ul>${children}</ul></details></li>`);
    }
    return wrapTreeView(parts.join(''));
}

function generateTypeHtml(groupedGames) {
    const parts = [];
    const types = Object.keys(groupedGames);
    for (let t = 0; t < types.length; t++) {
        const typeName = escHtml(langManager.translate(`game_type_${types[t]}`));
        const series = groupedGames[types[t]];
        const seriesKeys = Object.keys(series);
        const children = [];
        for (let s = 0; s < seriesKeys.length; s++) {
            const items = series[seriesKeys[s]];
            for (let g = 0; g < items.length; g++) {
                children.push(createGameListItem(items[g]));
            }
        }
        parts.push(`<li><details open><summary>${typeName}</summary><ul>${children.join('')}</ul></details></li>`);
    }
    return wrapTreeView(parts.join(''));
}

function createGameListItem(game) {
    const heart = game.isLoved ? '<span class="game-loved">★</span>' : '';
    const sign = escHtml(game.sign || '');
    const rawAchievement = getLocalizedField(game, 'spacialAchievements', langManager.getCurrentLang());
    const achievementText = rawAchievement ? escHtml(rawAchievement).replace(/\n/g, '<br>') : '';
    const name = getLocalizedField(game, 'name', langManager.getCurrentLang());
    const escapedName = escHtml(name);
    const gameName = /^[A-Za-z0-9\s]+$/.test(name) ? `<i>${escapedName}</i>` : escapedName;
    const qualityClass = `quality-${game.quality || 1}`;

    const timeHtml = `<span class="game-time">${sign} ${game.time}h</span>`;
    const nameHtml = `<strong>${gameName}</strong> ${heart}`;

    if (achievementText) {
        return `<li class="${qualityClass}"><details><summary>${nameHtml} ${timeHtml}</summary><ul><li><div class="achievement-info">${achievementText}</div></li></ul></details></li>`;
    }
    return `<li class="${qualityClass}">${nameHtml} ${timeHtml}</li>`;
}
