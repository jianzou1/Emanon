export function initGameRoll() {
    const CONFIG = {
      JSON_PATH: '/cfg/game_time_cfg.json',
      ITEM_HEIGHT: 30,
      VISIBLE_ITEMS: 8,
      MIN_ROLL_ITEMS: 20,
      ANIMATION_DURATION: 500,
      BASE_SPEED: 10.0,
      DECELERATION: 0.002,
    };
  
    const state = {
      isRolling: false,
      gameData: [],
      currentPosition: 0,
      targetIndex: -1,
      animationFrameId: null,
      loopData: [],
    };
  
    const dom = {
      rollBtn: null,
      result: null,
      scrollContainer: null,
      items: [],
    };
  
    // 初始化入口
    function init() {
      setupDOMReferences()
        .then(initializeComponents)
        .catch(handleInitializationError);
    }
  
    // 检查并设置DOM引用
    function setupDOMReferences() {
      return new Promise((resolve) => {
        const check = () => {
          dom.rollBtn = document.getElementById('gameRollBtn');
          dom.result = document.getElementById('gameResult');
          if (dom.rollBtn && dom.result) resolve();
          else setTimeout(check, 50);
        };
        check();
      });
    }
  
    // 初始化组件
    function initializeComponents() {
      createScrollContainer();
      setupEventListeners();
      loadGameData();
    }
  
    // 创建滚动容器
    function createScrollContainer() {
      dom.scrollContainer = document.createElement('div');
      dom.scrollContainer.className = 'scroll-container';
      dom.scrollContainer.style.height = `${CONFIG.ITEM_HEIGHT * CONFIG.VISIBLE_ITEMS}px`;
      dom.result.appendChild(dom.scrollContainer);
      createScrollItems();
    }
  
    // 创建滚动项
    function createScrollItems() {
      const total = CONFIG.VISIBLE_ITEMS + 2;
      const fragment = document.createDocumentFragment();
  
      dom.items = Array.from({ length: total }, (_, i) => {
        const item = document.createElement('div');
        item.className = 'scroll-item';
        item.style.cssText = `
          height: ${CONFIG.ITEM_HEIGHT}px;
          line-height: ${CONFIG.ITEM_HEIGHT}px;
          position: absolute;
          width: 100%;
          transition: transform 0.1s;
        `;
        item.textContent = 'Loading...';
        fragment.appendChild(item);
        return item;
      });
  
      dom.scrollContainer.appendChild(fragment);
    }
  
    // 设置事件监听器
    function setupEventListeners() {
      dom.rollBtn.addEventListener('click', () => {
        if (!state.isRolling) {
          const randomIndex = Math.floor(Math.random() * state.loopData.length);
          startRollWithTarget(randomIndex);
        }
      });
    }
  
    // 加载游戏数据
    async function loadGameData() {
      try {
        const response = await fetch(CONFIG.JSON_PATH);
        const data = await response.json();
        state.gameData = data[1] || [];
        state.loopData = generateLoopData();
        dom.rollBtn.disabled = false;
        updateVirtualItems();
      } catch (error) {
        showErrorMessage('数据加载失败，请检查文件路径');
      }
    }
  
    // 生成循环数据
    function generateLoopData() {
      const base = [...state.gameData];
      for (let i = base.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [base[i], base[j]] = [base[j], base[i]];
      }
      return base;
    }
  
    // 根据目标位置启动滚动
    function startRollWithTarget(targetIndex) {
      state.targetIndex = targetIndex;
      state.isRolling = true;
  
      const currentIndex = Math.abs(Math.round(state.currentPosition / CONFIG.ITEM_HEIGHT));
      const minDistance = CONFIG.MIN_ROLL_ITEMS * CONFIG.ITEM_HEIGHT;
      const targetPos = calculateTargetPosition(targetIndex);
  
      const baseDistance = Math.abs(targetPos - state.currentPosition);
      const actualDistance = baseDistance < minDistance
        ? baseDistance + Math.ceil(minDistance / (CONFIG.ITEM_HEIGHT * state.loopData.length)) * CONFIG.ITEM_HEIGHT * state.loopData.length
        : baseDistance;
  
      const initialVelocity = CONFIG.BASE_SPEED * CONFIG.ITEM_HEIGHT;
      const deceleration = CONFIG.DECELERATION * CONFIG.ITEM_HEIGHT;
      const duration = Math.min(
        (initialVelocity + Math.sqrt(initialVelocity * initialVelocity + 2 * deceleration * actualDistance)) / deceleration,
        CONFIG.ANIMATION_DURATION
      );
  
      animateDecelerationScroll({
        start: state.currentPosition,
        distance: actualDistance * (targetPos > state.currentPosition ? 1 : -1),
        initialVelocity,
        deceleration,
        duration,
      });
    }
  
    // 计算目标位置（考虑循环）
    function calculateTargetPosition(targetIndex) {
      const loopCount = Math.ceil((CONFIG.MIN_ROLL_ITEMS * 2) / state.loopData.length);
      const loopOffset = loopCount * state.loopData.length * CONFIG.ITEM_HEIGHT;
      return (targetIndex * CONFIG.ITEM_HEIGHT) - loopOffset;
    }
  
    // 物理减速动画
    function animateDecelerationScroll({ start, distance, initialVelocity, deceleration, duration }) {
      let startTime = null;
      const sign = Math.sign(distance);
      const maxScroll = state.loopData.length * CONFIG.ITEM_HEIGHT;
  
      const frame = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
  
        const currentDistance = sign * (
          initialVelocity * elapsed -
          0.5 * deceleration * elapsed * elapsed
        );
  
        state.currentPosition = start + currentDistance;
  
        if (Math.abs(state.currentPosition) >= maxScroll * 2) {
          state.currentPosition %= maxScroll;
        }
  
        updateVirtualItems();
  
        if (progress < 1) {
          state.animationFrameId = requestAnimationFrame(frame);
        } else {
          finalizePosition();
          state.isRolling = false;
        }
      };
  
      state.animationFrameId = requestAnimationFrame(frame);
    }
  
    // 更新虚拟滚动项
    function updateVirtualItems() {
      const maxScroll = state.loopData.length * CONFIG.ITEM_HEIGHT;
      const normalizedPos = (state.currentPosition % maxScroll + maxScroll) % maxScroll;
      const startIndex = Math.floor(normalizedPos / CONFIG.ITEM_HEIGHT);
  
      dom.items.forEach((item, i) => {
        const dataIndex = (startIndex + i) % state.loopData.length;
        const game = state.loopData[dataIndex];
        const yPos = (i * CONFIG.ITEM_HEIGHT) - (normalizedPos % CONFIG.ITEM_HEIGHT);
  
        item.textContent = game.name;
        item.className = `scroll-item quality-${game.quality}`;
        item.style.transform = `translateY(${yPos}px)`;
      });
    }
  
    // 最终位置校准
    function finalizePosition() {
      const targetPos = state.targetIndex * CONFIG.ITEM_HEIGHT;
      const currentLoop = Math.ceil(state.currentPosition / (state.loopData.length * CONFIG.ITEM_HEIGHT));
      state.currentPosition = targetPos + currentLoop * state.loopData.length * CONFIG.ITEM_HEIGHT;
      updateVirtualItems();
    }
  
    // 显示错误信息
    function showErrorMessage(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.color = 'red';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = message;
      document.body.prepend(errorDiv);
    }
  
    // 处理初始化错误
    function handleInitializationError(error) {
      showErrorMessage('系统初始化失败，请刷新页面重试。');
    }
  
    // 启动初始化
    init();
  }