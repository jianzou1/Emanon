// tabHandler.js


document.addEventListener('DOMContentLoaded', function() {
  const tabList = document.querySelector('[role="tablist"]');

  // 定义选项卡数据
  const tabData = [
    { url: '/', text: 'Time Progress' },
    { url: '/page/article.html', text: 'Article' },
    { url: '/page/game_design.html', text: 'Game Design' },
    { url: '/page/about.html', text: 'About Me' }
  ];

  // 动态生成选项卡
  tabData.forEach((tab, index) => {
    const li = document.createElement('li');
    li.setAttribute('data-url', tab.url);
    li.setAttribute('role', 'tab');
    li.innerHTML = `<a href="#tabs">${tab.text}</a>`;
    tabList.appendChild(li);
  });

  // 重新获取选项卡元素
  const tabs = document.querySelectorAll('[role="tab"]');

  // 根据当前页面的链接动态更改 selected 属性
  const currentUrl = window.location.pathname;
  tabs.forEach(tab => {
    const tabUrl = tab.getAttribute('data-url');
    // 处理 index.html 的路径
    const normalizedTabUrl = tabUrl === '/index.html' ? '/' : tabUrl;
    if (currentUrl === normalizedTabUrl) {
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.setAttribute('aria-selected', 'false');
    }
  });

  // 预加载选项卡中的其他链接
  tabs.forEach(tab => {
    const tabUrl = tab.getAttribute('data-url');
    if (currentUrl !== tabUrl) {
      console.log(`Preloading: ${tabUrl}`); // 添加日志输出
      fetch(tabUrl).then(response => {
        console.log(`Preloaded: ${tabUrl} - Status: ${response.status}`); // 添加日志输出
      }).catch(error => {
        console.error(`Error preloading: ${tabUrl}`, error); // 添加日志输出
      });
    }
  });

  tabList.addEventListener('click', function(event) {
    const clickedTab = event.target.closest('[role="tab"]');
    if (!clickedTab) return;

    const clickedTabUrl = clickedTab.getAttribute('data-url');
    if (currentUrl === clickedTabUrl) {
      return; // 如果当前页面链接和点击的选项卡链接相同，则阻止跳转
    }

    // 更新所有选项卡的 aria-selected 属性
    tabs.forEach(tab => {
      tab.setAttribute('aria-selected', tab === clickedTab);
    });

    const url = clickedTab.getAttribute('data-url');
    window.location.href = url; // 直接跳转到对应的 URL
  });
});
