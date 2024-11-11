// gameList.js
export function gameList() {
    const CONFIG_URL = 'game_time_cfg.json';
    const GAME_LIST_HTML_CLASS = '.game-list';

    fetchGameData();  // 在调用 gameList 时执行 fetchGameData

    async function fetchGameData() {
        try {
            const response = await fetch(CONFIG_URL);
            const data = await response.json();

            const typeNames = parseTypeNames(data[0][0].typeName);
            const explain = formatExplain(data[0][0], data[1]);
            const games = data[1];

            const sortedGames = games.sort((a, b) => b.time - a.time);
            const groupedGames = groupGames(sortedGames);
            const htmlContent = generateHtmlContent(groupedGames, typeNames, explain);
            
            document.querySelector(GAME_LIST_HTML_CLASS).innerHTML = htmlContent;

        } catch (error) {
            console.error("读取游戏数据失败:", error);
        }
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
        const jsonLink = data.jsonLink ? `<br><a href="${data.jsonLink}" target="_blank">查看配置文件</a>` : '';
        
        const totalTime = games.reduce((sum, game) => sum + game.time, 0);
        const totalDays = Math.floor(totalTime / 24);
        const totalYears = (totalTime / 24 / 365).toFixed(2);

        return explainText + jsonLink + `<br>游戏并非人生，但是我已经玩了：${totalTime}小时，相当于${totalDays}天，相当于${totalYears}年。`; // Games are not the only thing in my life, but I have already played
    }

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

    function generateHtmlContent(groupedGames, typeNames, explain) {
        let htmlContent = explain ? `<div class="explain">${explain}</div>` : '';
        const types = Object.keys(groupedGames);
        
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            htmlContent += `<h3>${typeNames[type]}</h3>`;
            const seriesTags = Object.keys(groupedGames[type]);
            
            for (const seriesTag of seriesTags) {
                const sortedGames = groupedGames[type][seriesTag];

                sortedGames.forEach(game => {
                    const recentlyClass = game.isRecently ? 'recently' : '';
                    const heart = game.isLoved ? '💜' : '';
                    const sign = game.sign ? game.sign : '';
                    const trophy = game.spacialAchievements ? '🏆' : ''; // 判断是否有特殊成就，并加上奖杯emoji

                    const gameName = /^[A-Za-z0-9\s]+$/.test(game.name) ? `<i>${game.name}</i>` : game.name;
                    
                    htmlContent += `
                        <li class="${recentlyClass}">
                            <span><strong>${gameName}</strong> ${heart} ${trophy}</span>
                            <span>${sign} ${game.time}小时</span>
                        </li>
                    `;
                });
            }

            if (i < types.length - 1) {
                htmlContent += `<hr>`;
            }
        }

        return htmlContent;
    }
}
