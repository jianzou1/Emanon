// gameList.js
export function gameList() {
    const CONFIG_URL = '/cfg/game_time_cfg.json'; // 配置文件的 URL
    const GAME_LIST_HTML_CLASS = '.game-list'; // 游戏列表的 HTML 类选择器
    const EXPLAIN_TEXT_CLASS = '.explain-text'; // 解释文本的类选择器
    const TOTAL_TIME_CLASS = '.total-time'; // 总时间的类选择器
    const TOTAL_DAYS_CLASS = '.total-days'; // 总天数的类选择器
    const TOTAL_YEARS_CLASS = '.total-years'; // 总年数的类选择器

    let games = []; // 存储游戏数据
    let typeNames = {}; // 存储类型名称
    let explainText = ''; // 存储解释文本

    fetchGameData(); // 获取游戏数据

    // 异步函数获取游戏数据
    async function fetchGameData() {
        try {
            const data = await fetchData(CONFIG_URL);
            typeNames = parseTypeNames(data[0][0].typeName);
            games = data[1] || []; // 确保获取到游戏数据

            // 更新内容
            updateHtmlContent(formatExplain(data[0][0], games));
        } catch (error) {
            console.error("读取游戏数据失败:", error.message);
        }
    }

    // 统一的 fetch 函数
    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`网络错误: ${response.status}`);
        return response.json();
    }

    // 更新页面的 HTML 内容
    function updateHtmlContent({ text, totalTime, totalDays, totalYears }) {
        explainText = text;
        document.querySelector(EXPLAIN_TEXT_CLASS).innerHTML = explainText;
        document.querySelector(TOTAL_TIME_CLASS).textContent = `${totalTime}小时`;
        document.querySelector(TOTAL_DAYS_CLASS).textContent = `，相当于${totalDays}天`;
        document.querySelector(TOTAL_YEARS_CLASS).textContent = `，相当于${totalYears}年。`;
        const htmlContent = generateHtmlContent(groupGames(games), typeNames);
        document.querySelector(GAME_LIST_HTML_CLASS).innerHTML = htmlContent; // 更新游戏列表
    }

    // 当选择变化时更新游戏列表
    document.querySelector('select').addEventListener('change', function(event) {
        sortGames(event.target.value);
    });

    // 封装排序逻辑
    function sortGames(selectedOption) {
        let sortedGames;

        if (selectedOption === '按游戏类型排序') {
            // 按游戏类型分组并内部倒序排序
            sortedGames = groupGames(games);
            Object.keys(sortedGames).forEach(type => {
                Object.keys(sortedGames[type]).forEach(seriesTag => {
                    sortedGames[type][seriesTag].sort((a, b) => b.time - a.time); // 按时间倒序排序
                });
            });
        } else if (selectedOption === '按游戏时长排序') {
            // 按游戏时长倒序排序
            sortedGames = [...games].sort((a, b) => b.time - a.time);
        }

        updateHtmlContentDetails(sortedGames);
    }

    function updateHtmlContentDetails(sortedGames) {
        const htmlContent = (Array.isArray(sortedGames) ? 
            sortedGames.map(game => createGameListItem(game)).join('') : 
            generateHtmlContent(sortedGames, typeNames));

        document.querySelector(GAME_LIST_HTML_CLASS).innerHTML = htmlContent; // 更新游戏列表
    }

    // 解析类型名称字符串为对象
    function parseTypeNames(typeNameStr) {
        return typeNameStr.split(',').reduce((acc, curr) => {
            const [key, value] = curr.split(':');
            acc[key] = value;
            return acc;
        }, {});
    }

    // 格式化解释文本，包括总时间和链接
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

    // 将游戏根据类型和系列标签分组
    function groupGames(games) {
        return games.reduce((acc, game) => {
            const type = game.type;
            const seriesTag = game.seriesTag || "无系列"; // 默认系列标签

            if (!acc[type]) {
                acc[type] = {};
            }

            if (!acc[type][seriesTag]) {
                acc[type][seriesTag] = []; // 一定要是数组
            }

            acc[type][seriesTag].push(game);
            return acc;
        }, {});
    }

    // 生成 HTML 内容
    function generateHtmlContent(groupedGames, typeNames = {}) {
        let htmlContent = '';

        const types = Object.keys(groupedGames);
        types.forEach((type, index) => {
            htmlContent += `<h3>${typeNames[type] || ''}</h3>`;
            for (const seriesTag of Object.keys(groupedGames[type])) {
                const gamesInSeries = groupedGames[type][seriesTag];

                // 确保是数组，否则输出警告并跳过
                if (Array.isArray(gamesInSeries)) {
                    htmlContent += gamesInSeries.map(game => createGameListItem(game)).join('');
                } else {
                    console.warn(`警告: ${seriesTag} 下没有游戏列表或者它不是数组。`, gamesInSeries);
                }
            }

            // 只有在不是最后一个类型时才添加水平分隔符
            if (index < types.length - 1) {
                htmlContent += '<hr>'; // 每种类型之间添加水平分隔符
            }
        });

        return htmlContent;
    }

    // 创建游戏列表项的 HTML
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

    // 处理点击事件的函数，切换成就显示
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
