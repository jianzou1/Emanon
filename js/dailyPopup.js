// dailyPopup.js — 使用通用弹窗组件
import { showPopup } from '/js/popup.js';

// 配置项
const POPUP_CONFIG = {
  interval: 0, // 24 小时（秒）
  popupId: 'welcome-popup',
};

// 初始化每日弹窗
export function initializeDailyPopup() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showDailyPopup, { once: true });
  } else {
    showDailyPopup();
  }
}

// 显示每日弹窗
function showDailyPopup() {
  // 只在一级域名（根路径）生效
  if (window.location.pathname !== '/') {
    return;
  }

  const now = Date.now();
  const lastShown = localStorage.getItem('dailyPopupLastShown');
  const lastShownTime = lastShown ? new Date(lastShown).getTime() : 0;

  if (!lastShown || (now - lastShownTime) / 1000 >= POPUP_CONFIG.interval) {
    displayPopup();
  }
}

// 构建并显示弹窗
function displayPopup() {
  const bodyHTML = `
    <p style="text-align: left; line-height: 1;" data-lang-id="dailty_popup_text"></p>
    <select id="lang-switcher">
      <option value="en">English</option>
      <option value="cn">简体中文</option>
      <option value="jp">にほんご</option>
    </select><br>
    <input type="checkbox" id="crtToggle" checked>
    <label for="crtToggle" data-lang-id="CRT">CRT Simulation</label>
    <p><strong class="version-date" data-lang-id="update_info"></strong></p>
    <hr>
  `;

  showPopup({
    id: POPUP_CONFIG.popupId,
    title: 'welcome',
    titleLangId: 'dailty_popup_title',
    bodyHTML,
    confirmLangId: 'btn_ok',
    confirmText: 'Confirm',
    overlayClose: true,
  });

  localStorage.setItem('dailyPopupLastShown', new Date().toISOString());
}
