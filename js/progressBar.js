// progressBar.js

let isUpdating = false; // 全局标志位，用于控制进度条动画的播放

export function updateProgressBar() {
    if (isUpdating) return; // 如果已经在更新，则直接返回
    isUpdating = true;

    const now = new Date();
    const gridWidth = 28; // 每个方格的宽度
    const container = document.querySelector('.progress-container');
    const containerWidth = container?.clientWidth;

    // 检查容器宽度
    if (!containerWidth) {
        console.error('Progress container not found or has no width.'); // 记录错误信息
        isUpdating = false; // 重置标志位
        return;
    }

    const totalGrids = Math.floor(containerWidth / (gridWidth + 2)); // 2px 是间隙的宽度

    function updateProgress(start, end, percentageId, progressBarId) {
        const totalDuration = (end - start) / (1000 * 60);
        const passedDuration = (now - start) / (1000 * 60);
        const targetPercentage = Math.min((passedDuration / totalDuration) * 100, 100); // 确保不超过100%

        const percentageElement = document.getElementById(percentageId);
        if (!percentageElement) {
            console.error(`Element with id ${percentageId} not found.`); // 记录错误信息
            isUpdating = false; // 重置标志位
            return;
        }

        const gridCount = Math.max(1, Math.floor((targetPercentage / 100) * totalGrids)); // 确保至少展示 1 个方格

        const progressBar = document.getElementById(progressBarId);
        if (!progressBar) {
            console.error(`Element with id ${progressBarId} not found.`); // 记录错误信息
            isUpdating = false; // 重置标志位
            return;
        }

        progressBar.innerHTML = ''; // 清空进度条

        function addGrid(i) {
            if (i < gridCount) {
                const grid = document.createElement('div');
                grid.className = 'grid';
                progressBar.appendChild(grid);
                const randomDelay = Math.random() * 80; // 生成随机延迟
                setTimeout(() => addGrid(i + 1), randomDelay); // 使用随机延迟
            } else {
                isUpdating = false; // 更新完成，重置标志位
            }
        }
        addGrid(0);

        let currentPercentage = 0;
        function animatePercentage() {
            if (currentPercentage < targetPercentage) {
                currentPercentage += 1; // 每次增加 1%
                percentageElement.innerText = Math.max(Math.floor(currentPercentage), 1) + '%'; // 确保最低为 1%
                requestAnimationFrame(animatePercentage);
            } else {
                percentageElement.innerText = Math.max(Math.floor(targetPercentage), 1) + '%'; // 确保最终值正确，最低为 1%
            }
        }
        animatePercentage();
    }

    // 更新年进度
    updateProgress(new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear() + 1, 0, 1), 'progress-percentage', 'progress-bar');

    // 更新月进度
    updateProgress(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1), 'month-percentage', 'month-progress-bar');

    // 更新天进度
    updateProgress(new Date(now.getFullYear(), now.getMonth(), now.getDate()), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), 'day-percentage', 'day-progress-bar');

    // 定时更新
    let timerId;

    function updateTimer() {
        const refreshTimerElement = document.getElementById('refresh-timer');
        const refreshContainer = document.getElementById('refresh-container');

        const now = new Date(); // 重新获取当前时间
        const secondsLeft = 3600 - (now.getMinutes() * 60 + now.getSeconds()); // 剩余秒数

        if (refreshTimerElement) {
            const minutesLeft = Math.floor(secondsLeft / 60);
            const secondsLeftWithinMinute = secondsLeft % 60;
            refreshTimerElement.innerText = `Refresh in ${minutesLeft}m ${secondsLeftWithinMinute}s`;
            if (refreshContainer && !refreshContainer.style.display) {
                refreshContainer.style.display = 'flex'; // 第一次更新后显示
            }
        }

        if (secondsLeft > 0) {
            timerId = setTimeout(updateTimer, 1000);
        } else {
            try {
                // 倒计时结束，更新进度条
                updateProgressBar(); // 每小时更新进度
            } catch (error) {
                console.error('Error updating progress bar:', error); // 记录错误信息
            }
        }
    }

    // 监听页面状态变化
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            clearTimeout(timerId); // 清除现有的计时器
            updateTimer(); // 重新启动计时器
        }
    });

    updateTimer(); // 启动初始计时器
}
