// 配置所有备选的 ASCII 字符的 txt 文件路径（根据实际文件修改）
const ASCII_TXT_PATHS = [
    '/ui/ascii1.txt',
    '/ui/ascii2.txt'
];

const FONT_FAMILY = '"Courier New", Courier, monospace';
const FONT_SIZE = 14; // px, 与 CSS 一致
const DEFAULT_LINE_INTERVAL_MS = 3;


// 用于中止旧的逐行渲染任务，避免重复初始化时动画叠加
let renderTaskId = 0;

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

const getOrCreateTextContainer = (logo) => {
  let textContainer = logo.querySelector('.text-container');
  if (!textContainer) {
    textContainer = document.createElement('div');
    textContainer.classList.add('text-container');
    logo.appendChild(textContainer);
  }
  return textContainer;
};

const normalizeLineInterval = (lineIntervalMs) => {
  const value = Number(lineIntervalMs);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_LINE_INTERVAL_MS;
};

// 阶段一：预置所有行（visibility:hidden 占位）并计算缩放
// 返回行元素数组供阶段二使用
const setupLinesAndScale = (logo, textContainer, lines) => {
  // 清空旧内容
  textContainer.textContent = '';

  // 为每行创建独立 span，全部 hidden（占位但不可见）
  const lineEls = lines.map((line, i) => {
    const span = document.createElement('span');
    span.textContent = line;
    span.style.visibility = 'hidden';
    // 除了最后一行，每行末尾加换行
    if (i < lines.length - 1) {
      textContainer.appendChild(span);
      textContainer.appendChild(document.createTextNode('\n'));
    } else {
      textContainer.appendChild(span);
    }
    return span;
  });

  // 计算缩放（此时所有行已在 DOM 中占位，布局完整且稳定）
  let maxChars = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxChars) maxChars = lines[i].length;
  }
  const safeChars = Math.max(maxChars, 1);
  const textWidth = safeChars * getCharWidth();
  const scale = logo.offsetWidth / textWidth;

  textContainer.style.setProperty('--logo-scale', scale);

  return lineEls;
};

// 阶段二：逐行显示（仅切换 visibility，布局零变化）
const revealLines = (lineEls, lineIntervalMs) => {
  const currentTaskId = ++renderTaskId;

  if (!lineEls.length) return;

  const step = (index) => {
    if (currentTaskId !== renderTaskId) return;

    lineEls[index].style.visibility = 'visible';

    if (index >= lineEls.length - 1) return;
    window.setTimeout(() => step(index + 1), lineIntervalMs);
  };

  step(0);
};


// 读取 txt 文件内容并显示到对应 div 中
const displayAsciiContent = async (lineIntervalMs = DEFAULT_LINE_INTERVAL_MS) => {
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

  const textContainer = getOrCreateTextContainer(logo);
  const lines = asciiContent.split('\n');
  const interval = normalizeLineInterval(lineIntervalMs);

  const lineEls = setupLinesAndScale(logo, textContainer, lines);
  revealLines(lineEls, interval);
};


// 主逻辑：显示随机 ASCII 字符
export const initializeRandomLogo = ({ lineIntervalMs = DEFAULT_LINE_INTERVAL_MS } = {}) => {
  displayAsciiContent(lineIntervalMs);
};

