#!/bin/sh

echo "开始处理文件夹..."

# 使用find命令来遍历当前目录下的所有文件夹并排除当前目录
find . -maxdepth 1 -type d ! -name '.' | while IFS= read -r dir; do
  echo "正在处理文件夹: $dir"
  
  # 检查layout和index文件是否存在
  layout_file="$dir/layout.html"
  index_file="$dir/index.html"

  if [ -f "$layout_file" ] && [ -f "$index_file" ]; then
    echo "找到layout和index文件"

    # 提取layout文件中的<title>内容
    title_content=$(sed -n 's/.*<title>\(.*\)<\/title>.*/\1/p' "$layout_file")
    echo "提取到的标题内容: $title_content"

    # 使用awk提取layout文件中的<body>内容并替换index文件中的内容
    awk -v layout_file="$layout_file" -v index_file="$index_file" -v title_content="$title_content" '
      FILENAME == layout_file {
        if (/<body>/) { in_body = 1; next }
        if (/<\/body>/) { in_body = 0; next }
        if (in_body) body = body $0 ORS
      }
      FILENAME == index_file {
        # 替换<title>标签中的标题内容
        if ($0 ~ /<title>这里替换标题<\/title>/) {
          print "<title>" title_content "</title>"
        }
        # 替换<div class="title-bar-text" id="dynamic-title">中的标题内容
        else if ($0 ~ /<div class="title-bar-text" id="dynamic-title">这里替换标题2<\/div>/) {
          print "<div class=\"title-bar-text\" id=\"dynamic-title\">" title_content "</div>"
        }
        # 替换<div class="window-body">中的body内容
        else if ($0 ~ /<div class="window-body">这里替换内容<\/div>/) {
          print "<div class=\"window-body\">" body "</div>"
        }
        else {
          print $0
        }
      }
    ' "$layout_file" "$index_file" > "${index_file}.tmp" && mv "${index_file}.tmp" "$index_file"

    echo "已替换index文件中的标题和body内容"
  else
    echo "警告: $dir 中未找到layout或index文件"
  fi

  echo "----------------------------"
done

echo "所有文件夹处理完毕"
echo "按任意键退出..."
read -n 1 -s -r -p ""
