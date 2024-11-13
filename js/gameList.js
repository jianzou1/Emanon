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
            updateHtmlContent(formatExplain(data[0][0], games));
            sortGames('按游戏类型排序'); // 默认按类型排序
        } catch (error) {
            console.error("读取游戏数据失败:", error.message);
        }
    }

    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`网络错误: ${response.status}`);
        return response.json();
    }

    function updateHtmlContent({ text, totalTime, totalDays, totalYears }) {
        document.querySelector(EXPLAIN_TEXT_CLASS).innerHTML = text;
        document.querySelector(TOTAL_TIME_CLASS).textContent = `${totalTime}小时`;
        document.querySelector(TOTAL_DAYS_CLASS).textContent = `，相当于${totalDays}天`;
        document.querySelector(TOTAL_YEARS_CLASS).textContent = `，相当于${totalYears}年。`;
        const htmlContent = generateHtmlContent(groupGames(games), typeNames);
        document.querySelector(GAME_LIST_HTML_CLASS).innerHTML = htmlContent; // 更新游戏列表
    }

    document.querySelector('select').addEventListener('change', function(event) {
        sortGames(event.target.value);
    });

    function sortGames(selectedOption) {
        let sortedGames;

        if (selectedOption === '按游戏类型排序') {
            // 按游戏类型分组
            sortedGames = groupGames(games);
            Object.keys(sortedGames).forEach(type => {
                Object.keys(sortedGames[type]).forEach(seriesTag => {
                    sortedGames[type][seriesTag].sort((a, b) => b.time - a.time);
                });
            });
        } else if (selectedOption === '按游戏时长排序') {
            // 按游戏时长排序
            sortedGames = [...games].sort((a, b) => b.time - a.time);
        }

        updateHtmlContentDetails(sortedGames); // 更新内容
    }

    function updateHtmlContentDetails(sortedGames) {
        const htmlContent = Array.isArray(sortedGames) ?
            sortedGames.map(game => createGameListItem(game)).join('') :
            generateHtmlContent(sortedGames, typeNames);

        document.querySelector(GAME_LIST_HTML_CLASS).innerHTML = htmlContent; // 更新游戏列表
    }

    function parseTypeNames(typeNameStr) {
        return typeNameStr.split(',').reduce((acc, curr) => {
            const [key, value] = curr.split(':');
            acc[key] = value;
            return acc;
        }, {});
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
            if (!acc[type]) {
                acc[type] = {};
            }
            if (!acc[type][seriesTag]) {
                acc[type][seriesTag] = [];
            }
            acc[type][seriesTag].push(game);
            return acc;
        }, {});
    }

    function generateHtmlContent(groupedGames, typeNames = {}) {
        let htmlContent = '';
        const types = Object.keys(groupedGames);

        types.forEach((type, index) => {
            htmlContent += `<h3>${typeNames[type] || ''}</h3>`;
            for (const seriesTag of Object.keys(groupedGames[type])) {
                const gamesInSeries = groupedGames[type][seriesTag];
                if (Array.isArray(gamesInSeries)) {
                    htmlContent += gamesInSeries.map(game => createGameListItem(game)).join('');
                }
            }
            if (index < types.length - 1) {
                htmlContent += '<hr>'; // 添加分隔符
            }
        });

        return htmlContent;
    }

    function createGameListItem(game) {
        const recentlyClass = game.isRecently ? 'recently' : '';
        const heart = game.isLoved ? '💜' : '';
        const sign = game.sign || '';
        const trophy = game.spacialAchievements ? '🏆' : '';
        const achievementText = game.spacialAchievements || '';
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

    window.toggleAchievement = function(li) {
        const achievementDiv = li.querySelector('.achievement');
        const toggleIcon = li.querySelector('.toggle-icon');

        if (achievementDiv) {
            const achievementText = achievementDiv.innerHTML;
            const nextElement = li.nextElementSibling;

            if (nextElement && nextElement.classList.contains('achievement-info')) {
                nextElement.remove();
                toggleIcon.innerHTML = achievementText ? '🙈' : '';
            } else {
                const achievementInfoDiv = document.createElement('div');
                achievementInfoDiv.className = 'achievement-info';
                achievementInfoDiv.innerHTML = achievementText;
                li.parentNode.insertBefore(achievementInfoDiv, nextElement);
                toggleIcon.innerHTML = '👀';
            }
        }
    }
}
