// 配置所有备选的 ASCII 字符的 txt 文件路径（根据实际文件修改）
const ASCII_TXT_PATHS = [
    '/ui/ascii1.txt',
    '/ui/ascii2.txt'
];

const FONT_FAMILY = '"Courier New", Courier, monospace';
const FONT_SIZE = 14; // px, 与 CSS 一致

// 缓存等宽字体的单字符宽度（只测量一次）
let charWidth = 0;
const getCharWidth = () => {
  if (charWidth > 0) return charWidth;
  const span = document.createElement('span');
  span.style.cssText = `font-family:${FONT_FAMILY};font-size:${FONT_SIZE}px;white-space:pre;position:absolute;visibility:hidden`;
  span.textContent = 'M'; // 等宽字体任意字符宽度相同
  document.body.appendChild(span);
  charWidth = span.offsetWidth;
  document.body.removeChild(span);
  return charWidth;
};

// 生成随机 txt 文件路径
const getRandomAsciiTxt = () => {
  const randomIndex = Math.floor(Math.random() * ASCII_TXT_PATHS.length);
  return ASCII_TXT_PATHS[randomIndex];
};

// 读取 txt 文件内容并显示到对应 div 中
const displayAsciiContent = async () => {
  const logo = document.querySelector('.logo');
  if (!logo) return;

  let asciiContent;
  try {
    const asciiTxtPath = getRandomAsciiTxt();
    const response = await fetch(asciiTxtPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    asciiContent = await response.text();
  } catch (error) {
    console.warn('[Logo] Failed to load ASCII art:', error);
    return;
  }

  let textContainer = logo.querySelector('.text-container');
  if (!textContainer) {
    textContainer = document.createElement('div');
    textContainer.classList.add('text-container');
    logo.appendChild(textContainer);
  }
  textContainer.textContent = asciiContent;

  // 计算文本自然宽度（最长行字符数 × 单字符宽度）
  const lines = asciiContent.split('\n');
  let maxChars = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxChars) maxChars = lines[i].length;
  }
  const textWidth = maxChars * getCharWidth();

  // 宽度铺满，高度溢出由容器 overflow:hidden 裁剪（与原始设计一致）
  const scale = logo.offsetWidth / textWidth;

  // 通过 CSS 自定义属性传递 scale，让 hover 可以继承叠加
  textContainer.style.setProperty('--logo-scale', scale);
  textContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
};

// 主逻辑：显示随机 ASCII 字符
export const initializeRandomLogo = () => {
  displayAsciiContent();
};
