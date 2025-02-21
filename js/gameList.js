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

    fetchGameData(); // 获取游戏数据

    async function fetchGameData() {
        try {
            const data = await fetchData(CONFIG_URL);
            typeNames = parseTypeNames(data[0][0].typeName);
            games = data[1] || [];
            const explainContent = formatExplain(data[0][0], games);
            updateHtmlContent(explainContent);
            sortGames('按游戏类型排序'); // 默认按类型排序
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
            throw error; // 重新抛出错误以在调用处处理
        }
    }

    function updateHtmlContent({ text, totalTime, totalDays, totalYears }) {
        document.querySelector(EXPLAIN_TEXT_CLASS).innerHTML = text;
        document.querySelector(TOTAL_TIME_CLASS).textContent = `${totalTime}小时`;
        document.querySelector(TOTAL_DAYS_CLASS).textContent = `，相当于${totalDays}天`;
        document.querySelector(TOTAL_YEARS_CLASS).textContent = `，相当于${totalYears}年。`;
        updateHtmlContentDetails(groupAndSortGamesByType()); // 更新游戏列表
    }

    // 更新单选框的事件监听器
    document.querySelectorAll('input[name="sort-option"]').forEach((radio) => {
        radio.addEventListener('change', (event) => {
            sortGames(event.target.value);
        });
    });

    function sortGames(selectedOption) {
        let sortedGames;

        if (selectedOption === '按游戏类型排序') {
            sortedGames = groupAndSortGamesByType();
        } else if (selectedOption === '按游戏时长排序') {
            sortedGames = [...games].sort((a, b) => b.time - a.time); // 按时长从长到短排序
        }

        updateHtmlContentDetails(sortedGames); // 更新内容
    }

    function groupAndSortGamesByType() {
        const groupedGames = groupGames(games);
        Object.keys(groupedGames).forEach(type => {
            Object.keys(groupedGames[type]).forEach(seriesTag => {
                groupedGames[type][seriesTag].sort((a, b) => b.time - a.time); // 按时长从长到短排序
            });
        });
        // 将每个类型内的系列按时间从长到短排序
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

    function updateHtmlContentDetails(sortedGames) {
        const gameListElement = document.querySelector(GAME_LIST_HTML_CLASS);
        gameListElement.innerHTML = Array.isArray(sortedGames) ?
            sortedGames.map(createGameListItem).join('') :
            generateHtmlContent(sortedGames, typeNames); // 更新游戏列表

        gameListElement.querySelectorAll('li').forEach((item, index) => {
            setTimeout(() => item.classList.add('flip-in'), index * 12); // 每个游戏延迟动画效果
        });
    }

    function parseTypeNames(typeNameStr) {
        return Object.fromEntries(typeNameStr.split(',').map(curr => curr.split(':')));
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
            const seriesTag = game.seriesTag || "无系列"; // 默认系列标签
            acc[type] = acc[type] || {};
            acc[type][seriesTag] = acc[type][seriesTag] || [];
            acc[type][seriesTag].push(game);
            return acc;
        }, {});
    }

    function generateHtmlContent(groupedGames, typeNames = {}) {
        return Object.entries(groupedGames).map(([type, series], index, types) => {
            const seriesContent = Object.entries(series).map(([seriesTag, gamesInSeries]) => gamesInSeries.map(createGameListItem).join('')).join('');
            return `<h3>${typeNames[type] || ''}</h3>${seriesContent}${index < types.length - 1 ? '<hr>' : ''}`;
        }).join('');
    }

    function createGameListItem(game) {
        const recentlyClass = game.isRecently ? 'recently' : '';
        const heart = game.isLoved ? '💜' : '';
        const sign = game.sign || '';
        const trophy = game.spacialAchievements ? '🏆' : '';
        const achievementText = game.spacialAchievements ? game.spacialAchievements.replace(/\n/g, '<br>') : '';
        const gameName = /^[A-Za-z0-9\s]+$/.test(game.name) ? `<i>${game.name}</i>` : game.name;

        return `
            <li class="${recentlyClass}" ${achievementText ? 'onclick="toggleAchievement(this)"' : ''}>
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

