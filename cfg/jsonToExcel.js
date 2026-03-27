/**
 * JSON → Excel 转换脚本（excelToJson.js 的逆操作）
 *
 * Excel 约定（与 excelToJson.js 一致）：
 * 第1行：备注（字段名的人类可读描述）
 * 第2行：类型（int/string/float/bool/int[]）
 * 第3行：字段名（keys）
 * 第4行起：数据
 *
 * 用法：
 * node jsonToExcel.js                                   // 自动转换 cfg/ 下所有 .json → excel/ 对应 .xlsx
 * node jsonToExcel.js ./data.json                       // 转换单个文件，输出到 excel/data.xlsx
 * node jsonToExcel.js ./data.json ./out.xlsx            // 指定输出路径
 *
 * 类型推断：
 * 脚本会从实际数据推断每列类型；若 excel/ 下已有同名 .xlsx，
 * 则优先读取其第1行（备注）和第2行（类型）作为模板，保留人工批注。
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ---------- 类型推断 ----------
function inferType(values) {
  // 过滤掉 null / undefined / ""
  const valid = values.filter(v => v != null && v !== "");
  if (valid.length === 0) return "string";

  // int[]
  if (valid.every(v => Array.isArray(v) && v.every(Number.isInteger))) return "int[]";
  // bool
  if (valid.every(v => typeof v === "boolean")) return "bool";
  // int（纯整数，不含浮点）
  if (valid.every(v => typeof v === "number" && Number.isInteger(v))) return "int";
  // float
  if (valid.every(v => typeof v === "number" && Number.isFinite(v))) return "float";
  // 兜底
  return "string";
}

function serializeCell(value, type) {
  if (value == null) return "";
  if (type === "int[]") {
    return Array.isArray(value) ? value.join(",") : String(value);
  }
  if (type === "bool") {
    return value === true ? "true" : value === false ? "false" : String(value);
  }
  return value;
}

// ---------- 读取已有 Excel 模板信息 ----------
function readExistingTemplate(xlsxPath) {
  if (!fs.existsSync(xlsxPath)) return null;

  try {
    const wb = XLSX.readFile(xlsxPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    if (rows.length < 3) return null;

    const comments = (rows[0] || []).map(v => String(v ?? ""));
    const types = (rows[1] || []).map(v => String(v ?? "").trim());
    const keys = (rows[2] || []).map(v => String(v ?? "").trim());

    // 建立 key → { comment, type } 映射
    const map = {};
    for (let i = 0; i < keys.length; i++) {
      if (keys[i]) {
        map[keys[i]] = {
          comment: comments[i] || "",
          type: types[i] || "",
        };
      }
    }
    return map;
  } catch {
    return null;
  }
}

// ---------- 列宽自适应 ----------
function autoFitColumns(aoa) {
  if (!aoa.length) return [];
  const colCount = Math.max(...aoa.map(r => r.length));
  const widths = [];

  for (let c = 0; c < colCount; c++) {
    let max = 8; // 最小宽度
    for (const row of aoa) {
      const cell = row[c];
      if (cell == null) continue;
      const str = String(cell);
      // 粗略计算：CJK 字符算 2 宽度，其他算 1
      let w = 0;
      for (const ch of str) {
        w += ch.charCodeAt(0) > 0x7f ? 2 : 1;
      }
      if (w > max) max = w;
    }
    widths.push({ wch: Math.min(max + 2, 60) }); // 上限 60
  }
  return widths;
}

// ---------- JSON → Excel ----------
function jsonToExcel(jsonPath, outPath) {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data) || data.length === 0) {
    console.error(`⚠ ${jsonPath}: 空数组或非数组，跳过`);
    return false;
  }

  // 收集所有 key（保持出现顺序）
  const keySet = new Set();
  data.forEach(obj => Object.keys(obj).forEach(k => keySet.add(k)));
  const keys = [...keySet];

  // 尝试读取已有 Excel 模板
  const templateMap = readExistingTemplate(outPath) || {};

  // 推断/确定类型
  const types = keys.map(k => {
    if (templateMap[k] && templateMap[k].type) return templateMap[k].type;
    return inferType(data.map(obj => obj[k]));
  });

  // 备注行：优先用模板，否则用 key 本身
  const comments = keys.map(k => {
    if (templateMap[k] && templateMap[k].comment) return templateMap[k].comment;
    return k;
  });

  // 组装二维数组
  const aoa = [];
  aoa.push(comments); // 第1行：备注
  aoa.push(types);    // 第2行：类型
  aoa.push(keys);     // 第3行：字段名

  // 第4行起：数据
  data.forEach(obj => {
    const row = keys.map((k, i) => serializeCell(obj[k], types[i]));
    aoa.push(row);
  });

  // 写入 Excel
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = autoFitColumns(aoa);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, outPath);

  return true;
}

// ---------- 批量转换 ----------
function convertJsonFolder() {
  const cfgDir = __dirname;
  const excelDir = path.join(cfgDir, "excel");

  if (!fs.existsSync(excelDir)) {
    fs.mkdirSync(excelDir, { recursive: true });
  }

  const files = fs.readdirSync(cfgDir).filter(f => f.endsWith(".json") && !f.startsWith("~$"));

  if (files.length === 0) {
    console.log("No .json files found in cfg/ folder");
    return;
  }

  files.forEach(file => {
    try {
      const jsonPath = path.join(cfgDir, file);
      const xlsxName = path.basename(file, ".json") + ".xlsx";
      const outPath = path.join(excelDir, xlsxName);

      if (jsonToExcel(jsonPath, outPath)) {
        console.log(`✓ ${file} → excel/${xlsxName}`);
      }
    } catch (err) {
      console.error(`✗ Error processing ${file}: ${err.message}`);
    }
  });
}

function convertSingleFile(jsonPath, outPath) {
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  if (!outPath) {
    const excelDir = path.join(__dirname, "excel");
    if (!fs.existsSync(excelDir)) fs.mkdirSync(excelDir, { recursive: true });
    outPath = path.join(excelDir, path.basename(jsonPath, ".json") + ".xlsx");
  }

  if (jsonToExcel(jsonPath, outPath)) {
    console.log(`✓ ${path.basename(jsonPath)} → ${outPath}`);
  }
}

// ---------- CLI ----------
function main() {
  const [, , jsonPath, outPath] = process.argv;

  if (!jsonPath) {
    convertJsonFolder();
    return;
  }

  convertSingleFile(jsonPath, outPath);
}

main();
