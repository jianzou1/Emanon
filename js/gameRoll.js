// gameRoll.js
import langManager from '/js/langManager.js';
import { fetchJSON } from '/js/dataCache.js';
import { normalizeGameData, parseConfigString, shuffleArray, getLocalizedField } from '/js/utils.js';

export function initGameRoll() {
  const CONFIG = {
    GAME_JSON_PATH: '/cfg/game_time_cfg.json',
    SYSTEM_JSON_PATH: '/cfg/system_cfg.json',
    VISIBLE_ITEMS: 3,
    PARTICIPATION_COUNT: 100,
    ANIMATION_DURATION: 1500,
    ITEM_HEIGHT: 30
  };

  const state = {
    isRolling: false,
    gameData: [],
    wonNames: new Set(JSON.parse(sessionStorage.getItem('gameWonNames') || '[]')),
    currentWinner: null,
    loopData: [],
    currentPos: 0,
    uniqueId: Date.now(),
    containerOffset: 0,  // 缓存，避免滚动时反复触发布局
    systemConfig: {
      typeName: {},
      qualityName: {}
    },
    typewriterTimer: null, // 打字机 setTimeout ID
    animationRafId: null   // 滚动动画 rAF ID
  };

  const dom = {
    rollBtn: null,
    result: null,
    story: null,
    container: null,
    items: []
  };

  const ITEM_STYLE = {
    height: `${CONFIG.ITEM_HEIGHT}px`,
    lineHeight: `${CONFIG.ITEM_HEIGHT}px`,
    position: 'absolute',
    width: '100%',
    willChange: 'transform',
    backfaceVisibility: 'hidden'
  };

  function init() {
    // SPA 化后 DOM 是同步注入的，优先同步查找
    dom.rollBtn = document.getElementById('gameRollBtn');
    dom.result = document.getElementById('gameResult');

    if (dom.rollBtn && dom.result) {
      setup();
    } else {
      // 极端情况：DOM 还没就绪（首次整页加载 + 脚本提前执行），用 rAF 重试一次
      requestAnimationFrame(() => {
        dom.rollBtn = document.getElementById('gameRollBtn');
        dom.result = document.getElementById('gameResult');
        if (dom.rollBtn && dom.result) {
          setup();
        }
      });
    }
  }

  function setup() {
    dom.story = document.getElementById('story');
    createScrollContainer();
    loadSystemConfig();
    loadGameData();
    bindEvents();
  }

  function createScrollContainer() {
    dom.container = document.createElement('div');
    dom.container.className = 'scroll-container';
    dom.container.style.height = `${CONFIG.ITEM_HEIGHT * CONFIG.VISIBLE_ITEMS}px`;

    const totalItems = CONFIG.VISIBLE_ITEMS + 4;
    dom.items = Array.from({ length: totalItems }, (_, i) => {
      const item = document.createElement('div');
      item.className = 'scroll-item';
      Object.assign(item.style, ITEM_STYLE);
      const span = document.createElement('span');
      span.textContent = `Game ${i + 1}`;
      item.appendChild(span);
      return item;
    });

    dom.result.appendChild(dom.container);
    dom.container.append(...dom.items);
  }

  // 返回尚未中过奖的游戏列表
  function getAvailableData() {
    return state.gameData.filter(item => !state.wonNames.has(item.name));
  }

  function bindEvents() {
    dom.rollBtn.addEventListener('click', handleRollClick);
  }

  // 加载系统配置（typeName 和 qualityName）
  async function loadSystemConfig() {
    try {
      const data = await fetchJSON(CONFIG.SYSTEM_JSON_PATH);
      
      // 解析系统配置
      data.forEach(item => {
        if (item.id === 'typeName' && item.value) {
          state.systemConfig.typeName = parseConfigString(item.value);
        } else if (item.id === 'qualityName' && item.value) {
          state.systemConfig.qualityName = parseConfigString(item.value);
        }
      });
    } catch (err) {
      console.warn('系统配置加载失败，使用默认值:', err);
    }
  }

  function handleRollClick() {
    if (!state.isRolling && state.gameData.length) {
      // 全部游戏已抽完时自动重置记录
      if (!getAvailableData().length) {
        state.wonNames.clear();
        sessionStorage.removeItem('gameWonNames');
      }
      startNewRoll();
    }
  }

  async function loadGameData() {
    try {
      const data = await fetchJSON(CONFIG.GAME_JSON_PATH);
      const gameData = normalizeGameData(data);
      if (!gameData.length) throw new Error('无效的游戏数据格式');

      state.gameData = shuffleArray(gameData).map(item => ({
        ...item,
        _uid: ++state.uniqueId
      }));

      state.loopData = generateLoopData();
      updateItems();
      dom.rollBtn.disabled = false;
    } catch {
      dom.result.innerHTML = `<div class="error">${langManager.translate('game_load_error')}</div>`;
      dom.rollBtn.disabled = true;
    }
  }

  // 填充滚动列表数据——一次性生成，避免 while 循环反复复制+洗牌
  function generateLoopData() {
    const loop = state.currentWinner ? [state.currentWinner] : [];
    const base = getAvailableData().filter(
      item => !state.currentWinner || item.name !== state.currentWinner.name
    );

    if (!base.length) return shuffleArray(loop);

    // 一次性计算需要多少轮 base 来填满 PARTICIPATION_COUNT
    const needed = CONFIG.PARTICIPATION_COUNT - loop.length;
    const fullRounds = Math.ceil(needed / base.length);

    for (let r = 0; r < fullRounds; r++) {
      const chunk = shuffleArray([...base]);
      const take = Math.min(chunk.length, CONFIG.PARTICIPATION_COUNT - loop.length);
      for (let i = 0; i < take; i++) loop.push(chunk[i]);
    }

    return shuffleArray(loop);
  }

  function startNewRoll() {
    state.isRolling = true;
    dom.items.forEach(item => item.classList.remove('winner-spring'));

    if (dom.story) {
      dom.story.textContent = '';
    }

    state.currentWinner = getWeightedRandom();
    if (!state.currentWinner) {
      state.isRolling = false;
      return;
    }

    // 开始前测量一次，整个动画期间复用
    state.containerOffset = Math.round(dom.result.offsetHeight / 2 - CONFIG.ITEM_HEIGHT / 2);

    state.loopData = generateLoopData();
    state.currentPos = 0;
    updateItems();
    startAnimation(calculateTargetDistance());
  }

  function calculateTargetDistance() {
    const winnerIndex = state.loopData.findIndex(i => i._uid === state.currentWinner._uid);
    return Math.round(
      winnerIndex * CONFIG.ITEM_HEIGHT - state.containerOffset
    ) + CONFIG.PARTICIPATION_COUNT * CONFIG.ITEM_HEIGHT;
  }

  function startAnimation(distance) {
    let startTime = null;
    const startPos = state.currentPos;

    const animate = timestamp => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / CONFIG.ANIMATION_DURATION, 1);
      // Cubic ease-in-out：从零速加速、中段全速、末段减速（老虎机感）
      const easing = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      state.currentPos = startPos + distance * easing;
      updateItems();

      progress < 1 ?
        (state.animationRafId = requestAnimationFrame(animate)) :
        finalizeAnimation();
    };

    state.animationRafId = requestAnimationFrame(animate);
  }

  function updateItems() {
    const maxPos = state.loopData.length * CONFIG.ITEM_HEIGHT;
    const normalizedPos = (state.currentPos % maxPos + maxPos) % maxPos;
    const startIndex = Math.floor(normalizedPos / CONFIG.ITEM_HEIGHT);
    const offset = normalizedPos % CONFIG.ITEM_HEIGHT;

    dom.items.forEach((item, i) => {
      const dataIndex = (startIndex + i) % state.loopData.length;
      const itemData = state.loopData[dataIndex];
      const yPos = Math.round(i * CONFIG.ITEM_HEIGHT - offset - state.containerOffset);
      const isWinner = !!state.currentWinner && itemData?._uid === state.currentWinner._uid;

      // 仅在内容变化时写入，减少不必要的 DOM 操作
      const span = item.firstElementChild;
      const newText = getLocalizedField(itemData, 'name', langManager.getCurrentLang()) || `Game ${i + 1}`;
      const newClass = `scroll-item quality-${itemData?.quality || 1}`;
      if (span.textContent !== newText) span.textContent = newText;
      if (item.className !== newClass) item.className = newClass;

      item.style.transform = `translateY(${yPos}px)`;
      const fw = isWinner ? 'bold' : '';
      const bs = isWinner ? '0 2px 8px rgba(255, 215, 0, 0.5)' : '';
      if (item.style.fontWeight !== fw) item.style.fontWeight = fw;
      if (item.style.boxShadow !== bs) item.style.boxShadow = bs;
    });
  }

  function finalizeAnimation() {
    requestAnimationFrame(() => {
      const winnerIndex = state.loopData.findIndex(i => i._uid === state.currentWinner._uid);
      state.currentPos = Math.round(
        winnerIndex * CONFIG.ITEM_HEIGHT - state.containerOffset
      );
      updateItems();

      // 对停在正中央（yPos=0）的中奖项播放弹簧动画
      const winnerItem = dom.items.find(item => item.style.transform === 'translateY(0px)');
      if (winnerItem) {
        winnerItem.classList.remove('winner-spring');
        void winnerItem.offsetWidth; // 重置动画
        winnerItem.classList.add('winner-spring');
      }

      // 记录本次中奖游戏，临时保存至 sessionStorage（刷新自动清除）
      state.wonNames.add(state.currentWinner.name);
      sessionStorage.setItem('gameWonNames', JSON.stringify([...state.wonNames]));

      if (dom.story) {
        dom.story.textContent = '';
        const text = getLocalizedField(state.currentWinner, 'story', langManager.getCurrentLang());
        if (text) {
          let i = 0;
          const type = () => {
            if (i < text.length) {
              dom.story.textContent += text[i];
              i++;
              state.typewriterTimer = setTimeout(type, 50);
            } else {
              state.typewriterTimer = null;
            }
          };
          type();
        }
      }

      state.isRolling = false;
    });
  }

  function getWeightedRandom() {
    const available = getAvailableData();
    if (!available.length) return null;

    const weights = available.map(item => Math.pow(2, item.quality));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < available.length; i++) {
      if (random < weights[i]) return available[i];
      random -= weights[i];
    }
    return available[0];
  }

  init();

  // 返回 cleanup 函数，供 main.js 在页面切换时调用
  return function cleanupGameRoll() {
    // 清理打字机 setTimeout
    if (state.typewriterTimer) {
      clearTimeout(state.typewriterTimer);
      state.typewriterTimer = null;
    }
    // 清理动画 rAF
    if (state.animationRafId) {
      cancelAnimationFrame(state.animationRafId);
      state.animationRafId = null;
    }
    // 移除 click 监听器
    if (dom.rollBtn) {
      dom.rollBtn.removeEventListener('click', handleRollClick);
    }
    state.isRolling = false;
  };
}