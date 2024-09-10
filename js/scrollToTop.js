// scrollToTop.js

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  function handleScroll() {
    const button = document.querySelector('.back-to-top');
    button.style.display = window.scrollY > 300 ? 'block' : 'none';
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', handleScroll);
    handleScroll();
  });
  