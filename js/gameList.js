// gameList.js
import langManager from '/js/langManager.js';
import { fetchJSON } from '/js/dataCache.js';
import { escHtml } from '/js/utils.js';

export function gameList() {
    const GAME_CONFIG_URL = '/cfg/game_time_cfg.json';
    const SYSTEM_CONFIG_URL = '/cfg/system_cfg.json';
    const GAME_LIST_HTML_CLASS = '.game-list';

    let games = [];
    let typeNames = {};
    let qualityNames = [];

    fetchGameData();

    async function fetchGameData() {
        try {
            const [gameData, systemData] = await Promise.all([
                fetchJSON(GAME_CONFIG_URL),
                fetchJSON(SYSTEM_CONFIG_URL)
            ]);

            const systemTypeName = getSystemValue(systemData, 'typeName');
            const systemQualityName = getSystemValue(systemData, 'qualityName');

            typeNames = parseTypeNames(systemTypeName);
            qualityNames = parseQualityNames(systemQualityName);
            games = normalizeGameData(gameData);

            const stats = calculateStats(games);
            updateHtmlContent(stats);
            sortGames('按游戏评级排序');

            // 绑定排序选项
            document.querySelectorAll('input[name="sort-option"]').forEach((radio) => {
                radio.addEventListener('change', (event) => {
                    sortGames(event.target.value);
                });
            });
        } catch (error) {
            console.error("读取游戏数据失败:", error.message);
        }
    }

    function getSystemValue(systemData, id) {
        if (!Array.isArray(systemData)) return '';
        return systemData.find(item => item.id === id)?.value || '';
    }

    function normalizeGameData(gameData) {
        if (Array.isArray(gameData)) {
            if (gameData[0] && typeof gameData[0] === 'object' && 'name' in gameData[0]) {
                return gameData;
            }
            if (Array.isArray(gameData[1])) return gameData[1];
        }
        return [];
    }

    function calculateStats(games) {
        const totalTime = games.reduce((sum, game) => sum + game.time, 0);
        const totalDays = Math.floor(totalTime / 24);
        const totalYears = (totalTime / 24 / 365).toFixed(2);
        return { totalTime, totalDays, totalYears };
    }

    function updateHtmlContent({ totalTime, totalDays, totalYears }) {
        const updateParam = (id, value) => {
            try {
                const el = document.querySelector(`[data-lang-id="${id}"]`);
                if (el) {
                    el.dataset.langParams = JSON.stringify([value]);
                    langManager.setParams(id, [value]);
                }
            } catch (e) {}
        };

        updateParam('total_time', totalTime);
        updateParam('equivalent_days', totalDays);
        updateParam('equivalent_years', totalYears);

        updateHtmlContentDetails(groupAndSortGamesByType());
    }

    function sortGames(selectedOption) {
        let sortedGames;

        if (selectedOption === '按游戏评级排序') {
            sortedGames = sortGamesByQuality();
        } else if (selectedOption === '按游戏类型排序') {
            sortedGames = groupAndSortGamesByType();
        } else if (selectedOption === '按游戏时长排序') {
            sortedGames = [...games].sort((a, b) => b.time - a.time);
        }

        updateHtmlContentDetails(sortedGames, selectedOption);
    }

    function sortGamesByQuality() {
        const grouped = games.reduce((acc, game) => {
            const qualityKey = String(game.quality || "0");
            if (!acc[qualityKey]) acc[qualityKey] = [];
            acc[qualityKey].push(game);
            return acc;
        }, {});

        const orderedGroups = [];
        qualityNames.forEach(({ key }) => {
            if (grouped[key]) {
                orderedGroups.push({
                    key,
                    games: grouped[key].sort((a, b) => b.time - a.time)
                });
                delete grouped[key];
            }
        });

        Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .forEach(([key, games]) => {
                orderedGroups.push({ key, games });
            });

        return orderedGroups;
    }

    function parseQualityNames(qualityNameStr) {
        if (!qualityNameStr) return [];
        return qualityNameStr.split(',')
            .map(item => {
                const [key, value] = item.trim().split(':');
                return { key: key.trim(), value: value.trim() };
            });
    }

    // ── Tree-view HTML 生成 ──

    function wrapTreeView(innerHtml) {
        return `<ul class="tree-view">${innerHtml}</ul>`;
    }

    function generateQualityHtml(orderedGroups) {
        const items = orderedGroups.map(({ key, games }) => {
            const quality = qualityNames.find(q => q.key === key);
            const title = escHtml(quality ? quality.value : `未定义评级（${key}）`);
            const children = games.map(createGameListItem).join('');
            return `<li><details open><summary>${title}</summary><ul>${children}</ul></details></li>`;
        }).join('');
        return wrapTreeView(items);
    }

    function generateHtmlContent(groupedGames, typeNames = {}) {
        const items = Object.entries(groupedGames).map(([type, series]) => {
            const typeName = escHtml(typeNames[type] || type);
            const children = Object.entries(series).map(([seriesTag, gamesInSeries]) =>
                gamesInSeries.map(createGameListItem).join('')
            ).join('');
            return `<li><details open><summary>${typeName}</summary><ul>${children}</ul></details></li>`;
        }).join('');
        return wrapTreeView(items);
    }

    function generateFlatHtml(sortedGames) {
        if (!Array.isArray(sortedGames) || !sortedGames.length) return '';
        return wrapTreeView(sortedGames.map(createGameListItem).join(''));
    }

    function updateHtmlContentDetails(sortedGames, selectedOption) {
        const gameListElement = document.querySelector(GAME_LIST_HTML_CLASS);
        let html;
        if (selectedOption === '按游戏评级排序') {
            html = generateQualityHtml(sortedGames);
        } else if (selectedOption === '按游戏类型排序') {
            html = generateHtmlContent(sortedGames, typeNames);
        } else {
            html = generateFlatHtml(sortedGames);
        }
        gameListElement.innerHTML = html || '';
        // 逐行淡入动画：只对直接游戏条目生效
        const items = gameListElement.querySelectorAll('.tree-view > li');
        items.forEach((item, index) => {
            setTimeout(() => item.classList.add('tree-fade-in'), index * 20);
        });
    }

    function parseTypeNames(typeNameStr) {
        if (!typeNameStr) return {};
        return Object.fromEntries(
            typeNameStr.split(',').map(curr => {
                const [key, value] = curr.split(':');
                return [key.trim(), value.trim()];
            })
        );
    }

    function groupGames(games) {
        return games.reduce((acc, game) => {
            const type = game.type;
            const seriesTag = game.seriesTag || "无系列";
            acc[type] = acc[type] || {};
            acc[type][seriesTag] = acc[type][seriesTag] || [];
            acc[type][seriesTag].push(game);
            return acc;
        }, {});
    }

    function groupAndSortGamesByType() {
        const groupedGames = groupGames(games);
        Object.keys(groupedGames).forEach(type => {
            Object.keys(groupedGames[type]).forEach(seriesTag => {
                groupedGames[type][seriesTag].sort((a, b) => b.time - a.time);
            });
        });
        Object.keys(groupedGames).forEach(type => {
            const seriesTags = Object.keys(groupedGames[type]);
            seriesTags.sort((a, b) => {
                const maxTimeA = Math.max(...groupedGames[type][a].map(game => game.time));
                const maxTimeB = Math.max(...groupedGames[type][b].map(game => game.time));
                return maxTimeB - maxTimeA;
            });
            groupedGames[type] = seriesTags.reduce((acc, seriesTag) => {
                acc[seriesTag] = groupedGames[type][seriesTag];
                return acc;
            }, {});
        });
        return groupedGames;
    }

    function createGameListItem(game) {
        const heart = game.isLoved ? '<span class="game-loved">★</span>' : '';
        const sign = escHtml(game.sign || '');
        const achievementText = game.spacialAchievements ? escHtml(game.spacialAchievements).replace(/\n/g, '<br>') : '';
        const escapedName = escHtml(game.name);
        const gameName = /^[A-Za-z0-9\s]+$/.test(game.name) ? `<i>${escapedName}</i>` : escapedName;
        const qualityClass = `quality-${game.quality || 1}`;

        // 严格遵循 98.css tree-view 标准结构
        const timeHtml = `<span class="game-time">${sign} ${game.time}h</span>`;
        const nameHtml = `<strong>${gameName}</strong> ${heart}`;

        if (achievementText) {
            return `<li class="${qualityClass}"><details><summary>${nameHtml} ${timeHtml}</summary><ul><li><div class="achievement-info">${achievementText}</div></li></ul></details></li>`;
        }

        return `<li class="${qualityClass}">${nameHtml} ${timeHtml}</li>`;
    }
}
