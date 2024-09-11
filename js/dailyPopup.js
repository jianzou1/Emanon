// dailyPopup.js

document.addEventListener('DOMContentLoaded', showDailyPopup);

// 配置项：弹窗展示时间间隔，单位为秒
const popupInterval = 86400; // 默认值为 24 小时（86400 秒）

async function fetchAndProcess(url, successCallback, errorCallback) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    const data = await response.text();
    successCallback(data);
  } catch (error) {
    console.error('Error loading content:', error);
    errorCallback?.(error); // 确保 errorCallback 存在时才调用
  }
}

async function showDailyPopup() {
  const now = Date.now();
  const lastShown = localStorage.getItem('dailyPopupLastShown');
  const lastShownTime = lastShown ? new Date(lastShown).getTime() : 0;

  if (!lastShown || (now - lastShownTime) / 1000 >= popupInterval) {
    await fetchAndProcess('/ui/dailyPopup.html', displayPopupContent, error => {
      console.error('Error loading daily popup:', error);
    });
  }
}

function displayPopupContent(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const popupContainer = document.createElement('div');
  popupContainer.innerHTML = doc.body.innerHTML;
  document.body.appendChild(popupContainer);

  doc.querySelectorAll('style').forEach(style => {
    const existingStyle = document.head.querySelector(`style[data-id="${style.getAttribute('data-id')}"]`);
    if (!existingStyle) document.head.appendChild(style);
  });

  doc.querySelectorAll('script').forEach(script => {
    const existingScript = document.body.querySelector(`script[data-id="${script.getAttribute('data-id')}"]`);
    if (!existingScript) {
      const newScript = document.createElement('script');
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript);
    }
  });

  initPopup();
  localStorage.setItem('dailyPopupLastShown', new Date().toISOString());
}

function initPopup() {
  const closeButton = document.getElementById('close-popup');
  const overlay = document.getElementById('overlay');
  const popup = document.getElementById('welcome-popup');

  if (!closeButton || !overlay || !popup) {
    console.error('Popup elements not found');
    return;
  }

  document.body.addEventListener('click', event => {
    if (event.target.id === 'close-popup') closePopup();
  });

  function closePopup() {
    popup.style.display = 'none';
    overlay.style.display = 'none';
  }

  function adjustPopupHeight() {
    const windowBody = document.querySelector('#welcome-popup .window-body');
    if (!windowBody) {
      console.error('Window body not found');
      return;
    }
    popup.style.height = `${windowBody.scrollHeight + 50}px`; // 加上标题栏和按钮的高度
  }

  window.onload = adjustPopupHeight;
}

// 确保 closePopup 函数在全局作用域中可用
window.closePopup = () => {
  const closeButton = document.getElementById('close-popup');
  const overlay = document.getElementById('overlay');
  const popup = document.getElementById('welcome-popup');

  if (!closeButton || !overlay || !popup) {
    console.error('Popup elements not found');
    return;
  }

  popup.style.display = 'none';
  overlay.style.display = 'none';
};
