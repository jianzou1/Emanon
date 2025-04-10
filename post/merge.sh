#!/bin/bash

SOURCE_FILE="index.html"
TARGET_DIRECTORY="."

# ---------- 第一部分：文件复制 ----------
if [ ! -f "$SOURCE_FILE" ]; then
    echo "错误：源文件 $SOURCE_FILE 不存在。"
    read -p "按回车键退出..."
    exit 1
fi

if [ ! -d "$TARGET_DIRECTORY" ]; then
    echo "错误：目标目录 $TARGET_DIRECTORY 不存在。"
    read -p "按回车键退出..."
    exit 1
fi

echo "开始复制文件到子文件夹..."
for dir in "$TARGET_DIRECTORY"/*/; do
    [ -d "$dir" ] && cp -v "$SOURCE_FILE" "$dir"
done

# ---------- 第二部分：内容替换处理 ----------
echo -e "\n开始处理子文件夹内容替换..."
for dir in "$TARGET_DIRECTORY"/*/; do
    dir=${dir%/}
    echo "正在处理文件夹: $dir"
    
    layout_file="$dir/layout.html"
    index_file="$dir/index.html"
    
    if [ -f "$layout_file" ] && [ -f "$index_file" ]; then
        # 改进的标题提取（支持多行和特殊字符）
        title_content=$(grep -oP '(?<=<title>).*?(?=</title>)' "$layout_file" | tr -d '\n')
        echo "提取到的标题: '$title_content'"

        # 使用AWK进行精确替换
        awk -v title="$title_content" '
        BEGIN { replaced_title = 0; replaced_dynamic = 0 }
        {
            # 替换主标题
            if (/<title>这里替换标题<\/title>/ && !replaced_title) {
                print "<title>" title "</title>"
                replaced_title = 1
                next
            }
            # 替换动态标题 
            if (/<div class="title-bar-text" id="dynamic-title">这里替换标题2<\/div>/ && !replaced_dynamic) {
                print "<div class=\"title-bar-text\" id=\"dynamic-title\">" title "</div>"
                replaced_dynamic = 1
                next
            }
            # 替换正文内容
            if (/<div class="window-body">这里替换内容<\/div>/ && body_content) {
                print "<div class=\"window-body\">" body_content "</div>"
                next
            }
            print
        }
        ' body_content="$(sed -n '/<body>/,/<\/body>/p' "$layout_file" | sed '1d;$d')" \
          "$index_file" > "$index_file.tmp" && mv "$index_file.tmp" "$index_file"
        
        echo "内容替换完成"
    else
        echo "警告: 缺少必要文件"
    fi
    echo "------------------------"
done

echo -e "\n所有操作已完成"
read -p "按回车键退出..."