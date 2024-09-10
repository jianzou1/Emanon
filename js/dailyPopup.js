// dailyPopup.js

// 配置项：弹窗展示时间间隔，单位为秒
const popupInterval = 86400; // 默认值为 24 小时（86400 秒）

async function fetchAndProcess(url, successCallback, errorCallback) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
    const data = await response.text();
    successCallback(data);
  } catch (error) {
    console.error('Error loading content:', error);
    if (errorCallback) errorCallback(error); // 确保 errorCallback 存在时才调用
  }
}

async function showDailyPopup() {
  const now = new Date();
  const lastShown = localStorage.getItem('dailyPopupLastShown');
  const lastShownDate = lastShown ? new Date(lastShown) : null;

  if (!lastShownDate || (now - lastShownDate) / 1000 >= popupInterval) {
    await fetchAndProcess('/ui/dailyPopup.html', displayPopupContent, error => {
      console.error('Error loading daily popup:', error);
    });
  }
}

function displayPopupContent(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const popupContainer = document.createElement('div');
  popupContainer.innerHTML = doc.querySelector('body').innerHTML;
  document.body.appendChild(popupContainer);

  doc.querySelectorAll('style').forEach(style => {
    if (!document.head.querySelector(`style[data-id="${style.getAttribute('data-id')}"]`)) {
      document.head.appendChild(style);
    }
  });

  doc.querySelectorAll('script').forEach(script => {
    if (!document.body.querySelector(`script[data-id="${script.getAttribute('data-id')}"]`)) {
      const newScript = document.createElement('script');
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript);
    }
  });

  localStorage.setItem('dailyPopupLastShown', new Date().toISOString());
}
