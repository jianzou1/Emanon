// gameList.js
export function gameList() {
    const CONFIG_URL = '/cfg/game_time_cfg.json';
    const GAME_LIST_HTML_CLASS = '.game-list';
    const EXPLAIN_TEXT_CLASS = '.explain-text';
    const TOTAL_TIME_CLASS = '.total-time';
    const TOTAL_DAYS_CLASS = '.total-days';
    const TOTAL_YEARS_CLASS = '.total-years';

    let games = [];
    let typeNames = {};
    let qualityNames = []; // 存储评级顺序配置

    fetchGameData();

    async function fetchGameData() {
        try {
            const data = await fetchData(CONFIG_URL);
            typeNames = parseTypeNames(data[0][0].typeName);
            qualityNames = parseQualityNames(data[0][0].qualityName); // 解析顺序配置
            games = data[1] || [];
            const explainContent = formatExplain(data[0][0], games);
            updateHtmlContent(explainContent);
            sortGames('按游戏评级排序');
        } catch (error) {
            console.error("读取游戏数据失败:", error.message);
        }
    }

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`网络错误: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error("数据获取失败:", error.message);
            throw error;
        }
    }

    function updateHtmlContent({ text, totalTime, totalDays, totalYears }) {
        document.querySelector(EXPLAIN_TEXT_CLASS).innerHTML = text;
        document.querySelector(TOTAL_TIME_CLASS).textContent = `${totalTime}小时`;
        document.querySelector(TOTAL_DAYS_CLASS).textContent = `，相当于${totalDays}天`;
        document.querySelector(TOTAL_YEARS_CLASS).textContent = `，相当于${totalYears}年。`;
        updateHtmlContentDetails(groupAndSortGamesByType());
    }

    document.querySelectorAll('input[name="sort-option"]').forEach((radio) => {
        radio.addEventListener('change', (event) => {
            sortGames(event.target.value);
        });
    });

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

    // 核心改动：按配置顺序分组
    function sortGamesByQuality() {
        // 1. 按quality分组
        const grouped = games.reduce((acc, game) => {
            const qualityKey = String(game.quality || "0"); // 强制转为字符串
            if (!acc[qualityKey]) acc[qualityKey] = [];
            acc[qualityKey].push(game);
            return acc;
        }, {});

        // 2. 按qualityNames顺序生成结果
        const orderedGroups = [];
        qualityNames.forEach(({ key }) => {
            if (grouped[key]) {
                orderedGroups.push({
                    key,
                    games: grouped[key].sort((a, b) => b.time - a.time) // 组内按时长排序
                });
                delete grouped[key];
            }
        });

        // 3. 处理未在配置中定义的评级（按原始key排序）
        Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0])) // 按key降序
            .forEach(([key, games]) => {
                orderedGroups.push({ key, games });
            });

        return orderedGroups;
    }

    function parseQualityNames(qualityNameStr) {
        return qualityNameStr.split(',')
            .map(item => {
                const [key, value] = item.trim().split(':');
                return { key: key.trim(), value: value.trim() };
            });
    }

    function generateQualityHtml(orderedGroups) {
        return orderedGroups.map(({ key, games }) => {
            const quality = qualityNames.find(q => q.key === key);
            const title = quality ? quality.value : `未定义评级（${key}）`;
            return `<h3>${title}</h3>${games.map(createGameListItem).join('')}`;
        }).join('');
    }

    // 其他保持原有逻辑的函数
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

    function updateHtmlContentDetails(sortedGames, selectedOption) {
        const gameListElement = document.querySelector(GAME_LIST_HTML_CLASS);
        let html;
        if (selectedOption === '按游戏评级排序') {
            html = generateQualityHtml(sortedGames);
        } else if (selectedOption === '按游戏类型排序') {
            html = generateHtmlContent(sortedGames, typeNames);
        } else {
            html = Array.isArray(sortedGames) 
                ? sortedGames.map(createGameListItem).join('')
                : '';
        }
        gameListElement.innerHTML = html || '';
        gameListElement.querySelectorAll('li').forEach((item, index) => {
            setTimeout(() => item.classList.add('flip-in'), index * 12);
        });
    }

    function parseTypeNames(typeNameStr) {
        return Object.fromEntries(
            typeNameStr.split(',').map(curr => {
                const [key, value] = curr.split(':');
                return [key.trim(), value.trim()];
            })
        );
    }

    function formatExplain(data, games) {
        const explainText = data.explain.replace(/\n/g, '<br>') || '';
        const totalTime = games.reduce((sum, game) => sum + game.time, 0);
        const totalDays = Math.floor(totalTime / 24);
        const totalYears = (totalTime / 24 / 365).toFixed(2);
        const jsonLink = `<br><a href="${CONFIG_URL}" target="_blank">查看配置文件</a>`;

        return {
            text: explainText + jsonLink,
            totalTime,
            totalDays,
            totalYears
        };
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

    function generateHtmlContent(groupedGames, typeNames = {}) {
        return Object.entries(groupedGames).map(([type, series], index, types) => {
            const seriesContent = Object.entries(series).map(([seriesTag, gamesInSeries]) => 
                gamesInSeries.map(createGameListItem).join('')
            ).join('');
            return `<h3>${typeNames[type] || ''}</h3>${seriesContent}${index < types.length - 1 ? '<hr>' : ''}`;
        }).join('');
    }

    function createGameListItem(game) {
        const heart = game.isLoved ? '💜' : '';
        const sign = game.sign || '';
        const trophy = game.spacialAchievements ? '🏆' : '';
        const achievementText = game.spacialAchievements ? game.spacialAchievements.replace(/\n/g, '<br>') : '';
        const gameName = /^[A-Za-z0-9\s]+$/.test(game.name) ? `<i>${game.name}</i>` : game.name;
        const qualityClass = `quality-${game.quality || 1}`;

        return `
            <li class="${qualityClass}" ${achievementText ? 'onclick="toggleAchievement(this)"' : ''}>
                <span>
                    <strong>${gameName}</strong> ${heart} ${trophy}
                </span>
                <span>${sign} ${game.time}小时 <span class="toggle-icon">${achievementText ? '🙈' : ''}</span></span>
                <div class="achievement" style="display: none;">${achievementText}</div>
            </li>
        `;
    }

    window.toggleAchievement = function (li) {
        const achievementDiv = li.querySelector('.achievement');
        const toggleIcon = li.querySelector('.toggle-icon');

        if (!achievementDiv) return;

        const nextElement = li.nextElementSibling;
        if (nextElement && nextElement.classList.contains('achievement-info')) {
            nextElement.remove();
            toggleIcon.innerHTML = achievementDiv.innerHTML ? '🙈' : '';
        } else {
            const achievementInfoDiv = document.createElement('div');
            achievementInfoDiv.className = 'achievement-info';
            achievementInfoDiv.innerHTML = achievementDiv.innerHTML;
            li.parentNode.insertBefore(achievementInfoDiv, nextElement);
            toggleIcon.innerHTML = '👀';
        }
    }
}