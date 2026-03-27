// gameList.js
import langManager from '/js/langManager.js';
import { fetchJSON } from '/js/dataCache.js';
import { escHtml } from '/js/utils.js';

const GAME_CONFIG_URL = '/cfg/game_time_cfg.json';
const SYSTEM_CONFIG_URL = '/cfg/system_cfg.json';
const GAME_LIST_HTML_CLASS = '.game-list';

// ── 模块级状态：跨页签切换持久化，避免重复计算 ──
let games = [];
let typeNames = {};
let qualityNames = [];
let dataLoaded = false;
let radiosBound = false;  // 事件委托标志，防止重复绑定

// ── 排序结果缓存：切换排序选项时命中缓存，避免重复分组/排序 ──
const sortCache = new Map(); // sortOption → html string
function invalidateSortCache() { sortCache.clear(); }

export function gameList() {
    if (dataLoaded) {
        // 数据已加载：直接渲染 + 绑定事件
        renderStats();
        renderSorted('按游戏评级排序');
        bindSortRadios();
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

        typeNames = parseTypeNames(getSystemValue(systemData, 'typeName'));
        qualityNames = parseQualityNames(getSystemValue(systemData, 'qualityName'));
        games = normalizeGameData(gameData);
        dataLoaded = true;

        renderStats();
        renderSorted('按游戏评级排序');
        bindSortRadios();
    } catch (error) {
        console.error("读取游戏数据失败:", error.message);
    }
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

// ── 排序选项事件：事件委托，只绑定一次 ──

function bindSortRadios() {
    if (radiosBound) return;
    const container = document.querySelector('.select-container');
    if (!container) return;
    radiosBound = true;

    container.addEventListener('change', (event) => {
        const radio = event.target.closest('input[name="sort-option"]');
        if (radio) renderSorted(radio.value);
    });
}

// ── 排序 + 渲染（带缓存） ──

function renderSorted(selectedOption) {
    const gameListElement = document.querySelector(GAME_LIST_HTML_CLASS);
    if (!gameListElement) return;

    // 缓存命中
    let html = sortCache.get(selectedOption);
    if (!html) {
        html = buildSortedHtml(selectedOption);
        sortCache.set(selectedOption, html);
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
    if (selectedOption === '按游戏评级排序') {
        return generateQualityHtml(sortGamesByQuality());
    }
    if (selectedOption === '按游戏类型排序') {
        return generateTypeHtml(groupAndSortGamesByType());
    }
    // 按游戏时长排序
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
    for (let i = 0; i < qualityNames.length; i++) {
        const key = qualityNames[i].key;
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
    // 分组
    const grouped = Object.create(null);
    for (let i = 0; i < games.length; i++) {
        const g = games[i];
        const type = g.type;
        const series = g.seriesTag || '无系列';
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
        const quality = qualityNames.find(q => q.key === key);
        const title = escHtml(quality ? quality.value : `未定义评级（${key}）`);
        const children = groupGames.map(createGameListItem).join('');
        parts.push(`<li><details open><summary>${title}</summary><ul>${children}</ul></details></li>`);
    }
    return wrapTreeView(parts.join(''));
}

function generateTypeHtml(groupedGames) {
    const parts = [];
    const types = Object.keys(groupedGames);
    for (let t = 0; t < types.length; t++) {
        const typeName = escHtml(typeNames[types[t]] || types[t]);
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
    const achievementText = game.spacialAchievements ? escHtml(game.spacialAchievements).replace(/\n/g, '<br>') : '';
    const escapedName = escHtml(game.name);
    const gameName = /^[A-Za-z0-9\s]+$/.test(game.name) ? `<i>${escapedName}</i>` : escapedName;
    const qualityClass = `quality-${game.quality || 1}`;

    const timeHtml = `<span class="game-time">${sign} ${game.time}h</span>`;
    const nameHtml = `<strong>${gameName}</strong> ${heart}`;

    if (achievementText) {
        return `<li class="${qualityClass}"><details><summary>${nameHtml} ${timeHtml}</summary><ul><li><div class="achievement-info">${achievementText}</div></li></ul></details></li>`;
    }
    return `<li class="${qualityClass}">${nameHtml} ${timeHtml}</li>`;
}

// ── 工具函数 ──

function getSystemValue(systemData, id) {
    if (!Array.isArray(systemData)) return '';
    return systemData.find(item => item.id === id)?.value || '';
}

function normalizeGameData(gameData) {
    if (Array.isArray(gameData)) {
        if (gameData[0] && typeof gameData[0] === 'object' && 'name' in gameData[0]) return gameData;
        if (Array.isArray(gameData[1])) return gameData[1];
    }
    return [];
}

function parseTypeNames(str) {
    if (!str) return {};
    return Object.fromEntries(str.split(',').map(c => {
        const [k, v] = c.split(':');
        return [k.trim(), v.trim()];
    }));
}

function parseQualityNames(str) {
    if (!str) return [];
    return str.split(',').map(item => {
        const [k, v] = item.trim().split(':');
        return { key: k.trim(), value: v.trim() };
    });
}
