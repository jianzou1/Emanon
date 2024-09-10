// progressBar.js

let isUpdating = false; // 全局标志位，用于控制进度条动画的播放

function updateProgressBar() {
    if (isUpdating) return; // 如果已经在更新，则直接返回
    isUpdating = true;

    const now = new Date();
    const gridWidth = 28; // 每个方格的宽度
    const containerWidth = document.querySelector('.progress-container').clientWidth;
    const totalGrids = Math.floor(containerWidth / (gridWidth + 2)); // 2px 是间隙的宽度

    function updateProgress(start, end, percentageId, progressBarId) {
        const totalDuration = (end - start) / (1000 * 60);
        const passedDuration = (now - start) / (1000 * 60);
        const targetPercentage = (passedDuration / totalDuration) * 100;

        const percentageElement = document.getElementById(percentageId);
        if (!percentageElement) return;

        const gridCount = Math.max(1, Math.floor((targetPercentage / 100) * totalGrids)); // 确保至少展示1个方格

        const progressBar = document.getElementById(progressBarId);
        if (progressBar) {
            progressBar.innerHTML = '';
        }
        
        let i = 0;
        function addGrid() {
            if (i < gridCount) {
                const grid = document.createElement('div');
                grid.className = 'grid';
                if (progressBar) {
                    progressBar.appendChild(grid);
                }
                i++;
                const minDelay = 0; // 最小延迟时间（毫秒）
                const maxDelay = 100; // 最大延迟时间（毫秒）
                const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay; // 生成一个最小值到最大值之间的随机延迟
                setTimeout(addGrid, randomDelay); // 使用随机延迟
            } else {
                while (progressBar && progressBar.children.length < gridCount) {
                    const grid = document.createElement('div');
                    grid.className = 'grid';
                    progressBar.appendChild(grid);
                }
                isUpdating = false; // 更新完成，重置标志位
            }
        }
        addGrid();

        let currentPercentage = 0;
        function animatePercentage() {
            if (currentPercentage < targetPercentage) {
                currentPercentage += 1; // 每次增加1%
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
}

// 页面加载时立即更新进度条
window.onload = function () {
    try {
        updateProgressBar();
    } catch (error) {
        console.error('Error updating progress bar:', error);
    }
};

// 每跨小时时更新进度条
function updateOnHourChange() {
    const now = new Date();
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
                updateProgressBar();
            } catch (error) {
                console.error('Error updating progress bar:', error);
            }
            updateOnHourChange();
        }
    }
    updateTimer();
}
updateOnHourChange();
