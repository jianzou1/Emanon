// footerLoader.js

document.addEventListener('DOMContentLoaded', function() {
  const footerContainer = document.querySelector('.dynamic-footer');
  
  if (footerContainer) {
    const footerContent = `
      <div class="status-bar">
        <p class="status-bar-field"> Created by Shelton </p>
        <p class="status-bar-field"> Artistic by Cry </p>
        <p class="status-bar-field" id="last-updated">Last Updated: {0}</p>
      </div>
    `;

    footerContainer.innerHTML = footerContent;

    // 获取 id 为 last-updated 的元素并插入更新日期
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
      getLastUpdatedDateFromGitHub()
        .then(lastUpdatedDate => {
          lastUpdatedElement.textContent = `Last Updated: ${lastUpdatedDate}`;
        })
        .catch(error => {
          console.error('Failed to fetch last updated date:', error);
          // 移除失败时展示本地时间的逻辑
          // lastUpdatedElement.textContent = `Last Updated: ${new Date().toLocaleDateString()}`;
        });
    } else {
      console.error('Element with id "last-updated" not found.');
    }
  } else {
    console.error('Element with class "dynamic-footer" not found.');
  }

  // 异步加载不蒜子统计脚本
  const script = document.createElement('script');
  script.async = true;
  script.src = "//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
  script.onload = function() {
    // 打印不蒜子脚本返回的 UV 结果
    const busuanziValue = document.getElementById('busuanzi_value_site_uv');
    if (busuanziValue) {
      console.log('不蒜子脚本返回的 UV 结果:', busuanziValue.textContent);
    } else {
      console.error('Element with id "busuanzi_value_site_uv" not found.');
    }
  };
  document.head.appendChild(script);
});

// 从 GitHub API 获取更新日期
async function getLastUpdatedDateFromGitHub() {
  const url = 'https://api.github.com/repos/jianzou1/drunkfrog';
  try {
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
    }); // 精确到分钟
    return lastUpdatedDate;
  } catch (error) {
    throw new Error(`Failed to fetch last updated date: ${error.message}`);
  }
}
