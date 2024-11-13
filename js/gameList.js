// gameList.js
export function gameList() {
    const CONFIG_URL = '/cfg/game_time_cfg.json'; // 配置文件的 URL
    const GAME_LIST_HTML_CLASS = '.game-list'; // 游戏列表的 HTML 类选择器
    const EXPLAIN_TEXT_CLASS = '.explain-text'; // 解释文本的类选择器
    const TOTAL_TIME_CLASS = '.total-time'; // 总时间的类选择器
    const TOTAL_DAYS_CLASS = '.total-days'; // 总天数的类选择器
    const TOTAL_YEARS_CLASS = '.total-years'; // 总年数的类选择器

    fetchGameData();  // 在调用 gameList 时执行 fetchGameData

    // 异步函数获取游戏数据
    async function fetchGameData() {
        try {
            const response = await fetch(CONFIG_URL);
            if (!response.ok) throw new Error(`网络错误: ${response.status}`); // 检查响应状态
            const data = await response.json();

            const typeNames = parseTypeNames(data[0][0].typeName);
            const games = data[1] || []; // 确保获取到游戏数据

            const { text, totalTime, totalDays, totalYears } = formatExplain(data[0][0], games);
            const groupedGames = groupGames(games.sort((a, b) => b.time - a.time));
            const htmlContent = generateHtmlContent(groupedGames, typeNames);

            updateHtmlContent(text, totalTime, totalDays, totalYears, htmlContent); // 更新内容

        } catch (error) {
            console.error("读取游戏数据失败:", error.message); // 捕获并输出错误信息
        }
    }

    // 更新页面的 HTML 内容
    function updateHtmlContent(explainText, totalTime, totalDays, totalYears, htmlContent) {
        document.querySelector(EXPLAIN_TEXT_CLASS).innerHTML = explainText;
        document.querySelector(TOTAL_TIME_CLASS).textContent = `${totalTime}小时`;
        document.querySelector(TOTAL_DAYS_CLASS).textContent = `，相当于${totalDays}天`;
        document.querySelector(TOTAL_YEARS_CLASS).textContent = `，相当于${totalYears}年。`;
        document.querySelector(GAME_LIST_HTML_CLASS).innerHTML += htmlContent;
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
            const seriesTag = game.seriesTag || "无系列";

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

    // 生成 HTML 内容
    function generateHtmlContent(groupedGames, typeNames) {
        let htmlContent = '';
    
        const types = Object.keys(groupedGames);
        types.forEach((type, index) => {
            htmlContent += `<h3>${typeNames[type]}</h3>`;
            for (const seriesTag of Object.keys(groupedGames[type])) {
                htmlContent += groupedGames[type][seriesTag].map(game => createGameListItem(game)).join('');
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
