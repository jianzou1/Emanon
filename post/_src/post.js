const fs = require('fs');
const path = require('path');
const marked = require('marked');

// -------------------- 配置项 --------------------
const SOURCE_DIR = __dirname; // 脚本所在目录
const TARGET_DIR = path.join(SOURCE_DIR, '../'); // 上级目录的 post 文件夹
const TEMPLATE_FILE = path.join(SOURCE_DIR, 'template.html'); // 模板文件路径

// -------------------- 工具函数 --------------------
// 创建目录（递归）
function mkdirp(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 提取 Markdown 第一行作为标题
function extractTitle(mdContent) {
  const firstLine = mdContent.split('\n')[0] || '';
  // 清除 Markdown 标题符号 (#) 和空格
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}

// 处理单个 Markdown 文件
function processMarkdownFile(mdPath) {
  // 读取内容
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  
  // 提取标题和转换内容
  const title = extractTitle(mdContent);
  const htmlBody = marked.parse(mdContent);

  // 读取模板并替换占位符
  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const finalHtml = template
    .replace(/<!--\s*TITLE\s*-->/g, title) // 替换标题占位符
    .replace(/<!--\s*CONTENT\s*-->/g, htmlBody); // 替换内容占位符

  // 生成目标路径（示例：post/my-article/index.html）
  const fileName = path.basename(mdPath, '.md');
  const targetFolder = path.join(TARGET_DIR, fileName);
  const targetHtml = path.join(targetFolder, 'index.html');

  // 写入文件
  mkdirp(targetFolder);
  fs.writeFileSync(targetHtml, finalHtml);
  console.log(`生成: ${path.relative(SOURCE_DIR, targetHtml)}`);
}

// -------------------- 主流程 --------------------
function main() {
  // 检查模板是否存在
  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(`模板文件不存在: ${TEMPLATE_FILE}`);
  }

  // 创建目标目录
  mkdirp(TARGET_DIR);

  // 遍历所有 .md 文件
  const mdFiles = fs.readdirSync(SOURCE_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(SOURCE_DIR, file));

  // 批量处理
  mdFiles.forEach(processMarkdownFile);
  console.log(`处理完成，共生成 ${mdFiles.length} 篇文章`);
}

// 执行
main();