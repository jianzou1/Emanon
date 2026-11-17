// dailyPopup.js — 「欢迎 / 显示设置」窗口：语言 + CRT 三档
// 点选即生效，不需要按确认；确认键只负责关窗
import { showPopup } from '/js/popup.js';
import { CRT_LEVELS, getCrtLevel, setCrtLevel } from '/js/crtSettings.js';
import langManager from '/js/langManager.js';

const POPUP_CONFIG = {
  interval: 86400, // 自动弹出的最小间隔（秒）= 24 小时
  popupId: 'welcome-popup',
  lastShownKey: 'dailyPopupLastShown',
};

// 初始化每日弹窗（自动弹出：仅首页 + 24 小时间隔）
export function initializeDailyPopup() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => showDailyPopup(), { once: true });
  } else {
    showDailyPopup();
  }
}

/**
 * 显示每日弹窗
 * @param {Object} [options]
 * @param {boolean} [options.force] - 跳过「仅首页」与 24 小时间隔判断，供关于弹窗 Title Bar 的 Help 按钮调用
 */
export function showDailyPopup({ force = false } = {}) {
  if (!force) {
    // 只在一级域名（根路径）生效
    if (window.location.pathname !== '/') {
      return;
    }

    const lastShown = localStorage.getItem(POPUP_CONFIG.lastShownKey);
    const lastShownTime = lastShown ? new Date(lastShown).getTime() : 0;
    if (lastShown && (Date.now() - lastShownTime) / 1000 < POPUP_CONFIG.interval) {
      return;
    }
  }

  displayPopup();
}

// 构建并显示弹窗
function displayPopup() {
  const bodyHTML = `
    <p class="popup-lead" data-lang-id="dailty_popup_text"></p>

    <fieldset class="popup-fieldset">
      <legend data-lang-id="popup_lang_legend"></legend>
      <div class="field-row">
        <select id="lang-switcher">
          <option value="en">English</option>
          <option value="cn">简体中文</option>
          <option value="jp">にほんご</option>
          <option value="kr">한국어</option>
        </select>
      </div>
    </fieldset>

    <fieldset class="popup-fieldset">
      <legend data-lang-id="CRT"></legend>
      ${CRT_LEVELS.map(
        (level) => `
      <div class="field-row">
        <input type="radio" id="crt-level-${level}" name="crtLevel" value="${level}">
        <label for="crt-level-${level}" data-lang-id="crt_level_${level}"></label>
      </div>`
      ).join('')}
    </fieldset>
  `;

  showPopup({
    id: POPUP_CONFIG.popupId,
    title: 'welcome',
    titleLangId: 'dailty_popup_title',
    bodyHTML,
    confirmLangId: 'btn_ok',
    confirmText: 'Confirm',
    overlayClose: true,
    onReady: ({ popup }) => {
      langManager.applyTranslationsIn(popup);

      const current = getCrtLevel();
      popup.querySelectorAll('input[name="crtLevel"]').forEach((radio) => {
        radio.checked = radio.value === current;
        radio.addEventListener('change', () => {
          if (radio.checked) setCrtLevel(radio.value);
        });
      });
    },
  });

  // 自动弹出与手动打开都记一次时间：保证「一天只被这个窗口打断一次」
  localStorage.setItem(POPUP_CONFIG.lastShownKey, new Date().toISOString());
}
