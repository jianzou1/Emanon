// 配置所有备选LOGO路径（根据实际文件修改）
const LOGO_PATHS = [
    '/ui/logo.jpg',
    '/ui/logo2.jpg',
    '/ui/logo3.jpg'
  ];
  
  // 生成随机LOGO路径（带防缓存时间戳）
  const getRandomLogo = () => {
    const randomIndex = Math.floor(Math.random() * LOGO_PATHS.length);
    return `${LOGO_PATHS[randomIndex]}?v=${Date.now()}`;
  };
  
  // 主逻辑：修改背景图属性
  export const initializeRandomLogo = () => {
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.style.backgroundImage = `url(${getRandomLogo()})`;
      logo.style.backgroundSize = 'contain'; // 确保继承原有contain特性
    }
  };
