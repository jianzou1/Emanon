document.addEventListener('DOMContentLoaded', function() {
  // 当页面内容加载完成后，添加滚动事件监听器，并初始化滚动处理、显示外部内容、加载页脚
  window.addEventListener('scroll', handleScroll);
  handleScroll();
  showExternalContent('layout.html');
  loadFooter();
});

function showExternalContent(url) {
  // 从指定URL获取外部内容，并在成功时显示内容，失败时显示错误信息
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      return response.text();
    })
    .then(data => displayContent(data))
    .catch(error => {
      console.error('Error loading external content:', error);
      displayError(error);
    });
}

function displayContent(html) {
  // 将获取到的HTML内容显示在指定容器中，并更新页面标题
  const content = document.querySelector('.window-body');
  content.innerHTML = '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const bodyContent = doc.querySelector('body').innerHTML;

  const fragment = document.createDocumentFragment();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = bodyContent;

  while (tempDiv.firstChild) {
    fragment.appendChild(tempDiv.firstChild);
  }

  content.appendChild(fragment);

  const title = doc.querySelector('title').innerText;
  document.getElementById('dynamic-title').innerText = title;
}

function displayError(error) {
  // 在指定容器中显示错误信息
  const content = document.querySelector('.window-body');
  content.innerHTML = `<p>Error loading content: ${error.message}</p>`;
}

function goBack() {
  // 返回上一页
  window.history.back();
}

function scrollToTop() {
  // 平滑滚动到页面顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleScroll() {
  // 根据滚动位置显示或隐藏“返回顶部”按钮
  const button = document.querySelector('.back-to-top');
  button.style.display = window.scrollY > 300 ? 'block' : 'none';
}

function loadFooter() {
  // 加载页脚内容，并在成功时插入到页面底部，失败时记录错误
  fetch('../../ui/footer.html')
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML('beforeend', data);
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript);
      });
    })
    .catch(error => {
      console.error('Error loading status-bar:', error);
    });
}
