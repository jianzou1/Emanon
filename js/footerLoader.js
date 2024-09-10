// footerLoader.js

document.addEventListener('DOMContentLoaded', function() {
  const footerContent = `
    <div class="status-bar">
      <p class="status-bar-field"> Created by Shelton </p>
      <p class="status-bar-field"> Artistic by Cry </p>
      <p class="status-bar-field" id="current-year"></p>
    </div>
  `;

  const footerContainer = document.querySelector('.dynamic-footer');
  footerContainer.innerHTML = footerContent;

  // 获取当前年份
  const currentYear = new Date().getFullYear();
  // 将当前年份插入到 id 为 current-year 的元素中
  document.getElementById('current-year').textContent = currentYear;
});
