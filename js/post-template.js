document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    showExternalContent('layout.html');
    loadFooter();
  });
  
  function showExternalContent(url) {
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
    const content = document.querySelector('.window-body');
    content.innerHTML = `<p>Error loading content: ${error.message}</p>`;
  }
  
  function goBack() {
    window.history.back();
  }
  
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  function handleScroll() {
    const button = document.querySelector('.back-to-top');
    button.style.display = window.scrollY > 300 ? 'block' : 'none';
  }
  
  function loadFooter() {
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
  