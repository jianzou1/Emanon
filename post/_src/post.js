const fs = require('fs');
const path = require('path');
const marked = require('marked');
const htmlMinifier = require('html-minifier-terser');

// -------------------- 配置项 --------------------
const SOURCE_DIR = __dirname;
const TARGET_DIR = path.join(SOURCE_DIR, '../');
const TEMPLATE_FILE = path.join(SOURCE_DIR, 'template.html');
const ARTICLE_CFG_PATH = path.join(SOURCE_DIR, '../../cfg/article_cfg.json');

const MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true,
  removeEmptyAttributes: true,
  keepClosingSlash: true
};

// 默认图标
const DEFAULT_ICON = 'text-markdown.png';

// -------------------- Frontmatter 解析 --------------------
function parseFrontmatter(mdContent) {
  const lines = mdContent.split('\n');
  const meta = {};
  let bodyStartIndex = 0;

  // 检测 frontmatter 开头（--- 或带 BOM 的 ---）
  const firstLine = lines[0].replace(/^\uFEFF/, '').trim();
  if (firstLine === '---') {
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex > 0) {
      // 解析 key: value 对
      for (let i = 1; i < endIndex; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        // 布尔值转换
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        // 数字转换
        else if (/^\d+$/.test(value)) value = parseInt(value, 10);

        meta[key] = value;
      }
      bodyStartIndex = endIndex + 1;
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n');
  return { meta, body };
}

// -------------------- 工具函数 --------------------
function mkdirp(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function extractTitleFromBody(body) {
  const firstLine = body.split('\n').find(l => l.trim() !== '') || '';
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}

async function minifyHtml(filePath) {
  try {
    const originalHtml = fs.readFileSync(filePath, 'utf8');
    const minifiedHtml = await htmlMinifier.minify(originalHtml, MINIFY_OPTIONS);
    fs.writeFileSync(filePath, minifiedHtml);
    console.log(`  压缩: ${path.relative(SOURCE_DIR, filePath)}`);
  } catch (err) {
    console.error(`  压缩失败: ${filePath}`, err);
  }
}

// -------------------- 单篇文章处理 --------------------
function processMarkdownFile(mdPath) {
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const { meta, body } = parseFrontmatter(mdContent);

  // 标题优先取 frontmatter，否则取正文第一行
  const title = meta.title || extractTitleFromBody(body);

  // 正文：如果有 frontmatter，正文已去掉 frontmatter 部分
  // 如果没有 frontmatter，兼容旧格式（跳过第一行标题行）
  let contentMd;
  if (Object.keys(meta).length > 0) {
    contentMd = body;
  } else {
    // 旧格式兼容：第一行是标题，跳过
    const lines = body.split('\n');
    contentMd = lines.slice(1).join('\n');
  }

  const htmlBody = marked.parse(contentMd);

  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const finalHtml = template
    .replace(/<!--\s*TITLE\s*-->/g, title)
    .replace(/<!--\s*CONTENT\s*-->/g, htmlBody);

  const fileName = path.basename(mdPath, '.md');
  const targetFolder = path.join(TARGET_DIR, fileName);
  const targetHtml = path.join(targetFolder, 'index.html');

  mkdirp(targetFolder);
  fs.writeFileSync(targetHtml, finalHtml);

  const hidden = meta.hidden === true;
  const icon = meta.icon || DEFAULT_ICON;
  const order = typeof meta.order === 'number' ? meta.order : 999;

  console.log(`  生成: ${fileName}/index.html${hidden ? ' (隐藏)' : ''}`);

  return {
    htmlPath: targetHtml,
    fileName,
    title,
    icon,
    hidden,
    order
  };
}

// -------------------- 生成 article_cfg.json --------------------
function generateArticleCfg(articles) {
  // 过滤隐藏文章，按 order 排序
  const visible = articles
    .filter(a => !a.hidden)
    .sort((a, b) => a.order - b.order);

  const cfg = visible.map((a, index) => ({
    id: index + 1,
    url: a.fileName,
    icon: a.icon,
    name: a.title
  }));

  const jsonText = JSON.stringify(cfg, null, 2);
  fs.writeFileSync(ARTICLE_CFG_PATH, jsonText, 'utf8');
  console.log(`\n  索引: cfg/article_cfg.json (${cfg.length} 篇可见文章)`);
}

// -------------------- 主流程 --------------------
async function main() {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(`模板文件不存在: ${TEMPLATE_FILE}`);
  }

  mkdirp(TARGET_DIR);

  const mdFiles = fs.readdirSync(SOURCE_DIR)
    .filter(file => file.endsWith('.md') && !file.startsWith('_'))
    .sort()
    .map(file => path.join(SOURCE_DIR, file));

  console.log(`\n开始构建文章 (${mdFiles.length} 个源文件)...\n`);

  const articles = mdFiles.map(processMarkdownFile);
  await Promise.all(articles.map(a => minifyHtml(a.htmlPath)));

  // 自动生成文章索引配置
  generateArticleCfg(articles);

  const visibleCount = articles.filter(a => !a.hidden).length;
  const hiddenCount = articles.filter(a => a.hidden).length;

  console.log(`
构建完成：
  - 共处理 ${mdFiles.length} 篇文章
  - ${visibleCount} 篇可见 / ${hiddenCount} 篇隐藏
  - 已生成 article_cfg.json
  `);
}

main().catch(err => console.error('运行出错:', err));
