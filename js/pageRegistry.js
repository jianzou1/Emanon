import { updateProgressBar } from '/js/progressBar.js';
import { loadPreviewLinks } from '/js/previewLoader.js';
import { initializeDailyPopup } from '/js/dailyPopup.js';
import { gameList } from '/js/gameList.js';
import { initGameRoll } from '/js/gameRoll.js';
import { initializeGallery } from '/js/gallery.js';
import { initializePassword } from '/js/password.js';
import { initializeMessageBoard } from '/js/messageBoard.js';

/**
 * 页面模块注册表（URL -> 初始化函数）
 * 约定：
 * - init(context) 仅负责“该页面自身”的初始化
 * - cleanup 由 main.js 统一调度，避免职责分散
 */
export const PAGE_MODULE_REGISTRY = {
  '/': {
    init() {
      updateProgressBar();
      initializeDailyPopup();
    },
  },
  '/page/article.html': {
    init({ pjax }) {
      loadPreviewLinks(pjax);
    },
  },
  '/page/game.html': {
    init({ setGameRollCleanup }) {
      gameList();
      setGameRollCleanup(initGameRoll());
    },
  },
  '/page/gallery.html': {
    init() {
      initializeGallery();
    },
  },
  '/page/password.html': {
    init({ pjax }) {
      initializePassword(pjax);
    },
  },
  '/page/message.html': {
    init() {
      initializeMessageBoard();
    },
  },
};

/**
 * 按 URL 执行页面初始化
 * @param {string} url
 * @param {object} context
 * @returns {boolean} 是否命中注册表
 */
export const runPageModuleByUrl = (url, context = {}) => {
  const module = PAGE_MODULE_REGISTRY[url];
  if (!module || typeof module.init !== 'function') {
    return false;
  }

  module.init(context);
  return true;
};
