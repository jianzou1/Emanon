// gameList.js
export function gameList() {
    const CONFIG_URL = 'game_time_cfg.json'; // 配置文件的 URL
    const GAME_LIST_HTML_CLASS = '.game-list'; // 游戏列表的 HTML 类选择器

    fetchGameData();  // 在调用 gameList 时执行 fetchGameData

    // 异步函数获取游戏数据
    async function fetchGameData() {
        try {
            const response = await fetch(CONFIG_URL); // 从配置 URL 获取数据
            const data = await response.json(); // 解析 JSON 数据

            const typeNames = parseTypeNames(data[0][0].typeName); // 解析类型名称
            const explain = formatExplain(data[0][0], data[1]); // 格式化解释文本
            const games = data[1]; // 获取游戏列表

            const sortedGames = games.sort((a, b) => b.time - a.time); // 按时间排序游戏
            const groupedGames = groupGames(sortedGames); // 将游戏分组
            const htmlContent = generateHtmlContent(groupedGames, typeNames, explain); // 生成 HTML 内容
            
            document.querySelector(GAME_LIST_HTML_CLASS).innerHTML = htmlContent; // 更新游戏列表的 HTML 内容

        } catch (error) {
            console.error("读取游戏数据失败:", error); // 捕获错误并输出
        }
    }

    // 解析类型名称字符串为对象
    function parseTypeNames(typeNameStr) {
        return typeNameStr.split(',').reduce((acc, curr) => {
            const [key, value] = curr.split(':'); // 将 key 和 value 分开
            acc[key] = value; // 填充对象
            return acc;
        }, {});
    }

    // 格式化解释文本，包括总时间和链接
    function formatExplain(data, games) {
        const explainText = data.explain.replace(/\n/g, '<br>') || ''; // 将换行符替换为 <br> 标签
        const jsonLink = data.jsonLink ? `<br><a href="${data.jsonLink}" target="_blank">查看配置文件</a>` : ''; // 如果有链接，则生成链接 HTML
        
        const totalTime = games.reduce((sum, game) => sum + game.time, 0); // 计算总时间
        const totalDays = Math.floor(totalTime / 24); // 计算总天数
        const totalYears = (totalTime / 24 / 365).toFixed(2); // 计算总年数，并保留两位小数

        // 返回最终格式化的文本
        return explainText + jsonLink + `<br>游戏并非人生，但是我已经玩了：${totalTime}小时，相当于${totalDays}天，相当于${totalYears}年。`;
    }

    // 将游戏根据类型和系列标签分组
    function groupGames(games) {
        return games.reduce((acc, game) => {
            const type = game.type; // 获取游戏类型
            const seriesTag = game.seriesTag || "无系列"; // 获取系列标签，默认为无系列

            if (!acc[type]) {
                acc[type] = {}; // 如果没有该类型，则新建一个对象
            }

            if (!acc[type][seriesTag]) {
                acc[type][seriesTag] = []; // 如果没有该系列标签，则新建一个数组
            }

            acc[type][seriesTag].push(game); // 将游戏加入对应的数组中
            return acc;
        }, {});
    }

    // 生成 HTML 内容
    function generateHtmlContent(groupedGames, typeNames, explain) {
        let htmlContent = explain ? `<div class="explain">${explain}</div>` : ''; // 如果有解释，则添加解释内容
        const types = Object.keys(groupedGames); // 获取分组的类型
        
        types.forEach((type, i) => {
            htmlContent += `<h3>${typeNames[type]}</h3>`; // 对每种类型添加标题
            const seriesTags = Object.keys(groupedGames[type]); // 获取该类型的所有系列标签
            
            seriesTags.forEach(seriesTag => {
                const sortedGames = groupedGames[type][seriesTag]; // 获取该系列的游戏

                sortedGames.forEach(game => {
                    const recentlyClass = game.isRecently ? 'recently' : ''; // 如果是最近玩的游戏，添加对应的类
                    const heart = game.isLoved ? '💜' : ''; // 如果喜欢该游戏，添加心形图标
                    const sign = game.sign ? game.sign : ''; // 获取游戏的标记
                    const trophy = game.spacialAchievements ? '🏆' : ''; // 如果有成就，添加奖杯图标
                    const achievementText = game.spacialAchievements || ''; // 获取成就文本

                    const gameName = /^[A-Za-z0-9\s]+$/.test(game.name) ? `<i>${game.name}</i>` : game.name; // 如果游戏名称只包含字母和数字，使用斜体展示

                    // 动态插入游戏和成就信息
                    htmlContent += `
                        <li class="${recentlyClass}" ${achievementText ? 'onclick="toggleAchievement(this)"' : ''}>
                            <span>
                                <strong>${gameName}</strong> ${heart} ${trophy}
                            </span>
                            <span>${sign} ${game.time}小时 <span class="toggle-icon">${achievementText ? '🙈' : ''}</span></span>
                            <div class="achievement" style="display: none;">${achievementText}</div>
                        </li>
                    `;
                });
            });

            if (i < types.length - 1) {
                htmlContent += `<hr>`; // 每种类型之间添加水平分隔符
            }
        });

        return htmlContent; // 返回生成的 HTML 内容
    }

    // 处理点击事件的函数，切换成就显示
    function toggleAchievement(li) {
        const achievementDiv = li.querySelector('.achievement'); // 查找成就 div
        const toggleIcon = li.querySelector('.toggle-icon'); // 查找切换图标

        if (achievementDiv) {
            const achievementText = achievementDiv.innerHTML; // 获取成就文本
            const nextElement = li.nextElementSibling; // 获取下一个兄弟元素

            if (nextElement && nextElement.classList.contains('achievement-info')) {
                nextElement.remove(); // 如果下一个元素是成就信息，移除它
                toggleIcon.innerHTML = achievementText ? '🙈' : ''; // 还原图标
            } else {
                const achievementInfoDiv = document.createElement('div'); // 创建成就信息 div
                achievementInfoDiv.className = 'achievement-info'; // 设置类名
                achievementInfoDiv.innerHTML = achievementText; // 填充成就信息
                li.parentNode.insertBefore(achievementInfoDiv, nextElement); // 在当前 li 前插入成就信息
                toggleIcon.innerHTML = '👀'; // 更改切换图标
            }
        }
    }

    window.toggleAchievement = toggleAchievement; // 将 toggleAchievement 暴露到窗口上，以供 HTML 点击事件使用
}
