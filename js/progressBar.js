import langManager from '/js/langManager.js';

let isUpdating = false;
let timerId = null;
let visibilityHandler = null;
let nextRefreshAt = 0;
const GRID_WIDTH = 28;
const GRID_GAP = 2;
const GRID_INTERVAL = 40;
const DOM_READY_MAX_RETRIES = 40; // ensureDOMReady 最大重试次数（40×50ms = 2s）

/**
 * 清理进度条模块的所有后台资源（定时器 + visibilitychange 监听器）。
 * 应在 PJAX 导航离开首页时调用，防止后台操作已不存在的 DOM 元素。
 */
export function cleanupProgressBar() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  isUpdating = false;
}

const PROGRESS_ITEMS = (now) => [
  {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear() + 1, 0, 1),
    percentageId: 'progress-percentage',
    progressBarId: 'progress-bar'
  },
  {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    percentageId: 'month-percentage',
    progressBarId: 'month-progress-bar'
  },
  {
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    percentageId: 'day-percentage',
    progressBarId: 'day-progress-bar'
  }
];

// 自定义刷新间隔配置（单位：秒）
// 默认 3600 秒 = 1 小时，可改为任意值，如：
// - 60: 每分钟刷新
// - 300: 每5分钟刷新
// - 1800: 每30分钟刷新
const REFRESH_INTERVAL = 1800;

export function updateProgressBar(skipTimerRestart = false) {
  if (isUpdating) {
    return;
  }
  isUpdating = true;

  const now = new Date();
  const container = document.querySelector('.progress-container');
  const containerWidth = container?.clientWidth;

  if (!containerWidth) {
    console.error('[Progress] container .progress-container not found');
    isUpdating = false;
    return;
  }

  const totalGrids = Math.floor(containerWidth / (GRID_WIDTH + GRID_GAP));
  const progressItems = PROGRESS_ITEMS(now);
  let completedCount = 0;
  const totalProgressBars = progressItems.length;

  const markProgressCompleted = () => {
    completedCount++;
    if (completedCount === totalProgressBars) {
      isUpdating = false;
      if (!skipTimerRestart) {
        startCountdownTimer();
      }
    }
  };

  function updateProgress(start, end, percentageId, progressBarId) {
    const totalDuration = (end - start) / (1000 * 60);
    const passedDuration = (now - start) / (1000 * 60);
    const targetPercentage = Math.min((passedDuration / totalDuration) * 100, 100);

    const percentageElement = document.getElementById(percentageId);
    if (!percentageElement) {
      console.error(`[Progress] element not found: ${percentageId}`);
      markProgressCompleted();
      return;
    }

    const gridCount = Math.max(1, Math.floor((targetPercentage / 100) * totalGrids));
    const progressBar = document.getElementById(progressBarId);
    if (!progressBar) {
      console.error(`[Progress] element not found: ${progressBarId}`);
      markProgressCompleted();
      return;
    }

    // 先清空并重置为0%，强制从头播放动画
    progressBar.innerHTML = '';
    percentageElement.textContent = '0%';

    // 使用 requestAnimationFrame 确保浏览器先渲染清空状态
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const totalGridTime = gridCount * GRID_INTERVAL;

        function addGrid(i) {
          if (i < gridCount) {
            const grid = document.createElement('div');
            grid.className = 'grid';
            progressBar.appendChild(grid);
            setTimeout(() => addGrid(i + 1), GRID_INTERVAL);
          } else {
            // 仅日进度条：动画完成后最后一个 grid 持续闪烁
            if (progressBarId === 'day-progress-bar') {
              const lastGrid = progressBar.lastElementChild;
              if (lastGrid) {
                lastGrid.classList.add('blink');
              }
            }
            markProgressCompleted();
          }
        }
        addGrid(0);

        // 百分比动画，从0%开始到目标百分比
        let startTime = performance.now();
        function animatePercentage() {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / totalGridTime, 1);
          const currentPercentage = progress * targetPercentage;
          percentageElement.textContent = `${Math.max(Math.floor(currentPercentage), 1)}%`;
          if (progress < 1) {
            requestAnimationFrame(animatePercentage);
          } else {
            percentageElement.textContent = `${Math.max(Math.floor(targetPercentage), 1)}%`;
          }
        }
        animatePercentage();
      });
    });
  }

  progressItems.forEach(({ start, end, percentageId, progressBarId }) => {
    updateProgress(start, end, percentageId, progressBarId);
  });
}

function startCountdownTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  nextRefreshAt = (Math.floor(nowSec / REFRESH_INTERVAL) + 1) * REFRESH_INTERVAL * 1000;

  const updateTimer = () => {
    const refreshTimerElement = document.getElementById('refresh-timer');
    const refreshContainer = document.getElementById('refresh-container');
    const currentMs = Date.now();
    const secondsLeft = Math.max(0, Math.ceil((nextRefreshAt - currentMs) / 1000));

    if (refreshTimerElement) {
      const minutesLeft = Math.floor(secondsLeft / 60);
      const secondsLeftWithinMinute = secondsLeft % 60;

      langManager.applyParameters(
        refreshTimerElement,
        'index_refresh',
        minutesLeft,
        secondsLeftWithinMinute
      );

      if (refreshContainer) {
        refreshContainer.style.display = 'flex';
      }
    }

    if (secondsLeft > 0) {
      const delayToNextSecond = 1000 - (currentMs % 1000) + 5;
      timerId = setTimeout(updateTimer, delayToNextSecond);
    } else {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }

      isUpdating = false;
      updateProgressBar(false);

      if (refreshTimerElement) {
        langManager.applyParameters(
          refreshTimerElement,
          'timer.refresh_complete',
          new Date().toLocaleTimeString()
        );
      }
    }
  };

  // SPA 化后 DOM 通常已同步注入，常规路径单次命中即返回；
  // 保留轮询兜底是为 visibilitychange 恢复时（页面后台切回）DOM 仍可能尚未稳定的极端情况。
  const ensureDOMReady = (callback, interval = 50) => {
    let retries = 0;
    const check = () => {
      if (document.getElementById('refresh-timer')) {
        callback();
      } else if (retries++ < DOM_READY_MAX_RETRIES) {
        setTimeout(check, interval);
      }
    };
    check();
  };

  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      ensureDOMReady(updateTimer);
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  if (langManager.isInitialized) {
    ensureDOMReady(updateTimer);
  } else {
    langManager.init().then(() => ensureDOMReady(updateTimer));
  }
}

