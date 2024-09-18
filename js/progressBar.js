// progressBar.js

let isUpdating = false; // 全局标志位，用于控制进度条动画的播放

export function updateProgressBar() {
    if (isUpdating) return; // 如果已经在更新，则直接返回
    isUpdating = true;

    const now = new Date();
    const gridWidth = 28; // 每个方格的宽度
    const containerWidth = document.querySelector('.progress-container')?.clientWidth;
    
    // 检查容器宽度
    if (!containerWidth) {
        console.log('Progress container not found or has no width.'); // 打印普通日志
        isUpdating = false; // 切记要重置标志位
        return;
    }

    const totalGrids = Math.floor(containerWidth / (gridWidth + 2)); // 2px 是间隙的宽度

    function updateProgress(start, end, percentageId, progressBarId) {
        const totalDuration = (end - start) / (1000 * 60);
        const passedDuration = (now - start) / (1000 * 60);
        const targetPercentage = (passedDuration / totalDuration) * 100;

        const percentageElement = document.getElementById(percentageId);
        if (!percentageElement) {
            console.log(`Element with id ${percentageId} not found.`); // 打印普通日志
            isUpdating = false; // 重置标志位
            return;
        }

        const gridCount = Math.max(1, Math.floor((targetPercentage / 100) * totalGrids)); // 确保至少展示 1 个方格

        const progressBar = document.getElementById(progressBarId);
        if (progressBar) {
            progressBar.innerHTML = '';
        } else {
            console.log(`Element with id ${progressBarId} not found.`); // 打印普通日志
            isUpdating = false; // 更新过程中发生错误也重置标志位
            return;
        }

        function addGrid(i) {
            if (i < gridCount) {
                const grid = document.createElement('div');
                grid.className = 'grid';
                progressBar.appendChild(grid);
                const minDelay = 0; // 最小延迟时间（毫秒）
                const maxDelay = 100; // 最大延迟时间（毫秒）
                const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay; // 生成一个最小值到最大值之间的随机延迟
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
                percentageElement.innerText = Math.floor(currentPercentage) + '%';
                requestAnimationFrame(animatePercentage);
            } else {
                percentageElement.innerText = Math.floor(targetPercentage) + '%'; // 确保最终值正确
            }
        }
        animatePercentage();
    }

    // 更新年进度
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
    updateProgress(startOfYear, endOfYear, 'progress-percentage', 'progress-bar');

    // 更新月进度
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    updateProgress(startOfMonth, endOfMonth, 'month-percentage', 'month-progress-bar');

    // 更新天进度
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    updateProgress(startOfDay, endOfDay, 'day-percentage', 'day-progress-bar');

    // 定时更新
    const minutesUntilNextHour = 60 - now.getMinutes();
    const secondsUntilNextHour = minutesUntilNextHour * 60 - now.getSeconds();
    let secondsLeft = secondsUntilNextHour;

    function updateTimer() {
        const refreshTimerElement = document.getElementById('refresh-timer');
        const refreshContainer = document.getElementById('refresh-container');
        if (refreshTimerElement) {
            const minutesLeft = Math.floor(secondsLeft / 60);
            const secondsLeftWithinMinute = secondsLeft % 60;
            refreshTimerElement.innerText = `Refresh in ${minutesLeft}m ${secondsLeftWithinMinute}s`;
            if (refreshContainer && !refreshContainer.style.display) {
                refreshContainer.style.display = 'flex'; // 第一次更新后显示
            }
        }
        secondsLeft--;
        if (secondsLeft >= 0) {
            setTimeout(updateTimer, 1000);
        } else {
            try {
                updateProgressBar(); // 每小时更新进度
            } catch (error) {
                console.log('Error updating progress bar:', error); // 打印普通日志
            }
            updateOnHourChange(); // 递归调用更新方法
        }
    }
    updateTimer();
}
