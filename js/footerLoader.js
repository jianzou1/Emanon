document.addEventListener('DOMContentLoaded', function() {
  const footerContainer = document.querySelector('.dynamic-footer');

  if (!footerContainer) {
    console.error('Element with class "dynamic-footer" not found.');
    return;
  }

  // 设置页面底部内容
  const footerContent = `
    <div class="status-bar">
      <p class="status-bar-field"> Created by Shelton </p>
      <p class="status-bar-field"> Artistic by Cry </p>
      <p class="status-bar-field" id="last-updated"></p>
    </div>
  `;
  
  footerContainer.innerHTML = footerContent;
  const lastUpdatedElement = footerContainer.querySelector('#last-updated');

  // 检查当前页面链接并更新内容
  if (lastUpdatedElement) {
    if (window.location.href.includes('post')) {
      lastUpdatedElement.textContent = `${new Date().getFullYear()}`; // 直接设置带有前缀的当前年份
    } else {
      updateLastUpdatedDate(lastUpdatedElement);
    }
  } else {
    console.error('Element with id "last-updated" not found.');
  }
});

// 更新最后修改日期
async function updateLastUpdatedDate(element) {
  try {
    const lastUpdatedDate = await getLastUpdatedDateFromGitHub();
    element.textContent = `Last Updated: ${lastUpdatedDate}`; // 含前缀的更新时间
  } catch (error) {
    console.error('Failed to fetch last updated date:', error);
  }
}

// 从 GitHub API 获取更新日期
async function getLastUpdatedDateFromGitHub() {
  const url = 'https://api.github.com/repos/jianzou1/drunkfrog';
  const cacheKey = 'lastUpdatedDate';
  const cacheExpiration = 3600000; // 1小时的毫秒数

  // 检查缓存
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    const { timestamp, date } = JSON.parse(cachedData);
    if (Date.now() - timestamp < cacheExpiration) {
      return date;
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const lastUpdatedDate = new Date(data.updated_at).toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 缓存结果
  localStorage.setItem(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    date: lastUpdatedDate
  }));

  return lastUpdatedDate;
}
