export function initGameRoll() {
  // 配置参数
  const CONFIG = {
    JSON_PATH: '/cfg/game_time_cfg.json',
    VISIBLE_ITEMS: 3,
    PARTICIPATION_COUNT: 100,
    ANIMATION_DURATION: 1500,
    ITEM_HEIGHT: 30
  };

  // 系统状态管理
  const state = {
    isRolling: false,
    gameData: [],
    currentWinner: null,
    loopData: [],
    currentPos: 0,
    uniqueId: Date.now(),
    retryCount: 0
  };

  // DOM元素引用
  const dom = {
    rollBtn: null,
    result: null,
    container: null,
    items: []
  };

  // 样式配置常量
  const ITEM_STYLE = {
    height: `${CONFIG.ITEM_HEIGHT}px`,
    lineHeight: `${CONFIG.ITEM_HEIGHT}px`,
    position: 'absolute',
    width: '100%',
    transition: 'transform 0.1s',
    willChange: 'transform',
    backfaceVisibility: 'hidden'
  };

  // 初始化入口
  function init() {
    setupDOM()
      .then(() => {
        createScrollContainer();
        loadGameData();
        bindEvents();
      })
      .catch(handleInitError);
  }

  // DOM初始化（添加超时保护）
  function setupDOM() {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const checkElements = () => {
        dom.rollBtn = document.getElementById('gameRollBtn');
        dom.result = document.getElementById('gameResult');
        
        if (dom.rollBtn && dom.result) {
          resolve();
        } else if (retries++ < 20) {
          setTimeout(checkElements, 50);
        } else {
          reject(new Error('DOM元素加载超时'));
        }
      };
      checkElements();
    });
  }

  // 创建滚动容器
  function createScrollContainer() {
    dom.container = document.createElement('div');
    dom.container.className = 'scroll-container';
    dom.container.style.height = `${CONFIG.ITEM_HEIGHT * CONFIG.VISIBLE_ITEMS}px`;

    const totalItems = CONFIG.VISIBLE_ITEMS + 4;
    dom.items = Array.from({ length: totalItems }, (_, i) => {
      const item = document.createElement('div');
      item.className = 'scroll-item';
      Object.assign(item.style, ITEM_STYLE);
      item.textContent = `游戏${i + 1}`;
      return item;
    });

    dom.result.appendChild(dom.container);
    dom.container.append(...dom.items);
  }

  // 事件绑定
  function bindEvents() {
    dom.rollBtn.addEventListener('click', handleRollClick);
  }

  // 抽奖按钮点击处理
  function handleRollClick() {
    if (!state.isRolling && state.gameData.length) {
      startNewRoll();
    }
  }

  // 数据加载（添加请求超时）
  async function loadGameData() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(CONFIG.JSON_PATH, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      validateGameData(data);

      state.gameData = shuffleArray(data[1]).map(item => ({
        ...item,
        _uid: ++state.uniqueId
      }));

      state.loopData = generateInitialData();
      updateItems();
      dom.rollBtn.disabled = false;
    } catch (error) {
      handleDataError(error);
    }
  }

  // 数据验证
  function validateGameData(data) {
    if (!data?.[1]) {
      throw new Error('无效的游戏数据格式');
    }
  }

  // 错误处理
  function handleDataError(error) {
    console.error('数据加载失败:', error);
    dom.result.innerHTML = '<div class="error">数据加载失败，请刷新页面</div>';
    dom.rollBtn.disabled = true;
  }

  function handleInitError(error) {
    console.error('初始化失败:', error);
    dom.result.innerHTML = '<div class="error">系统初始化失败，请检查网络</div>';
  }

  // 数据生成逻辑
  function generateDefaultData() {
    return Array.from({ length: CONFIG.PARTICIPATION_COUNT }, (_, i) => ({
      name: `游戏${i + 1}`,
      quality: 1,
      _uid: ++state.uniqueId
    }));
  }

  function generateInitialData() {
    return state.gameData.length ? 
      generateLoopData({ includeWinner: false }) : 
      generateDefaultData();
  }

  function generateLoopData(options = {}) {
    const { includeWinner = true } = options;
    const baseData = shuffleArray([...state.gameData]);
    const loop = [];
    const usedNames = new Set();

    if (includeWinner && state.currentWinner) {
      loop.push(state.currentWinner);
      usedNames.add(state.currentWinner.name);
    }

    while (loop.length < CONFIG.PARTICIPATION_COUNT) {
      const availableItems = baseData.filter(item => !usedNames.has(item.name));
      if (availableItems.length === 0) break;

      const newItem = availableItems[Math.floor(Math.random() * availableItems.length)];
      loop.push(newItem);
      usedNames.add(newItem.name);
    }

    return shuffleArray(loop);
  }

  // 抽奖核心逻辑
  function startNewRoll() {
    if (state.retryCount > 3) {
      handleMaxRetries();
      return;
    }

    prepareNewRoll();
    state.currentWinner = getWeightedRandom();

    // 打印抽奖结果（保留原有功能）
    console.log('抽奖对象：', JSON.parse(JSON.stringify(state.currentWinner)));

    if (!validateCurrentWinner()) {
      handleInvalidWinner();
      return;
    }

    state.loopData = generateLoopData();
    state.retryCount++;

    if (!validateWinnerExists()) {
      handleMissingWinner();
      return;
    }

    resetRollState();
    startAnimation(calculateTargetDistance());
  }

  function prepareNewRoll() {
    void dom.result.offsetHeight; // 强制重排
    state.isRolling = true;
  }

  function validateCurrentWinner() {
    return !!state.currentWinner;
  }

  function validateWinnerExists() {
    return state.loopData.some(i => 
      i._uid === state.currentWinner._uid &&
      i.name === state.currentWinner.name
    );
  }

  function handleMaxRetries() {
    console.error('最大重试次数已达');
    state.isRolling = false;
  }

  function handleInvalidWinner() {
    console.error('未找到中奖对象');
    state.isRolling = false;
  }

  function handleMissingWinner() {
    console.warn('数据异常，重新生成', state.retryCount);
    startNewRoll();
  }

  function resetRollState() {
    state.retryCount = 0;
    state.currentPos = 0;
    updateItems();
  }

  // 动画相关
  function calculateTargetDistance() {
    const containerHeight = dom.result.offsetHeight;
    const winnerIndex = state.loopData.findIndex(i => i._uid === state.currentWinner._uid);
    return Math.round(
      (winnerIndex * CONFIG.ITEM_HEIGHT) - 
      (containerHeight / 2 - CONFIG.ITEM_HEIGHT / 2)
    ) + CONFIG.PARTICIPATION_COUNT * CONFIG.ITEM_HEIGHT;
  }

  function startAnimation(distance) {
    let startTime = null;
    const startPos = state.currentPos;

    const animate = timestamp => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / CONFIG.ANIMATION_DURATION, 1);
      const easing = 1 - Math.pow(1 - progress, 3);

      state.currentPos = startPos + distance * easing;
      updateItems();

      progress < 1 ? 
        requestAnimationFrame(animate) : 
        finalizeAnimation();
    };

    requestAnimationFrame(animate);
  }

  // 显示更新
  function updateItems() {
    const maxPos = state.loopData.length * CONFIG.ITEM_HEIGHT;
    const normalizedPos = (state.currentPos % maxPos + maxPos) % maxPos;
    const startIndex = Math.floor(normalizedPos / CONFIG.ITEM_HEIGHT);
    const offset = Math.round(normalizedPos % CONFIG.ITEM_HEIGHT);
    const containerOffset = Math.round(dom.result.offsetHeight / 2 - CONFIG.ITEM_HEIGHT / 2);

    dom.items.forEach((item, i) => {
      const dataIndex = (startIndex + i) % state.loopData.length;
      const itemData = state.loopData[dataIndex];
      const yPos = Math.round((i * CONFIG.ITEM_HEIGHT) - offset - containerOffset);

      updateItemAppearance(item, itemData, yPos);
      highlightWinner(item, itemData);
    });
  }

  function updateItemAppearance(item, itemData, yPos) {
    item.textContent = itemData?.name || `游戏${i + 1}`;
    item.className = `scroll-item quality-${itemData?.quality || 1}`;
    item.style.transform = `translateY(${yPos}px)`;
  }

  function highlightWinner(item, itemData) {
    if (state.currentWinner && itemData?._uid === state.currentWinner._uid) {
      item.style.fontWeight = 'bold';
      item.style.boxShadow = '0 2px 8px rgba(255, 215, 0, 0.5)';
    } else {
      item.style.fontWeight = '';
      item.style.boxShadow = '';
    }
  }

  function finalizeAnimation() {
    requestAnimationFrame(() => {
      const containerHeight = dom.result.offsetHeight;
      const winnerIndex = state.loopData.findIndex(i => i._uid === state.currentWinner._uid);
      const targetY = Math.round(
        (winnerIndex * CONFIG.ITEM_HEIGHT) - 
        (containerHeight / 2 - CONFIG.ITEM_HEIGHT / 2)
      );

      state.currentPos = targetY;
      updateItems();
      state.isRolling = false;
    });
  }

  // 工具函数
  function getWeightedRandom() {
    if (!state.gameData.length) {
      return {
        name: '默认中奖',
        quality: 1,
        _uid: ++state.uniqueId
      };
    }

    const weights = state.gameData.map(item => Math.pow(2, item.quality));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < state.gameData.length; i++) {
      if (random < weights[i]) return state.gameData[i];
      random -= weights[i];
    }
    return state.gameData[0];
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // 启动初始化
  init();
}