#!/bin/bash

# 启用严格错误检查（关闭 pipefail 以避免并行问题）
set -eu

SOURCE_FILE="index.html"
TARGET_DIRECTORY="."
TEMPFILE_PATTERN=".tmp.XXXXXXXX"
PARALLEL_JOBS=4  # 根据CPU核心数调整

# ---------- 函数定义 ----------
error_exit() {
    local msg="$1"
    echo "错误：$msg" >&2
    exit 1
}

safe_replace() {
    local file="$1"
    local tempfile
    tempfile=$(mktemp "$file.$TEMPFILE_PATTERN")
    cat > "$tempfile"
    mv "$tempfile" "$file"
}

# ---------- 第一部分：前置检查 ----------
echo "正在执行初始化检查..."
[[ -f "$SOURCE_FILE" ]] || error_exit "源文件 $SOURCE_FILE 不存在"
[[ -d "$TARGET_DIRECTORY" ]] || error_exit "目标目录 $TARGET_DIRECTORY 不存在"

# ---------- 第二部分：主处理逻辑 ----------
process_directory() {
    local dir="$1"
    # 使用子shell封装处理逻辑，合并stderr到stdout
    (
        exec 2>&1  # 合并错误输出到标准输出
        echo "开始处理目录"
        
        # 安全复制文件
        if ! cp -f "$SOURCE_FILE" "$dir"; then
            echo "错误: 文件复制失败，跳过目录"
            exit 1
        fi

        # 处理内容替换
        local layout_file="$dir/layout.html"
        local index_file="$dir/index.html"
        
        if [[ ! -f "$layout_file" || ! -f "$index_file" ]]; then
            echo "警告: 缺少必要文件，跳过目录"
            exit 1
        fi

        # 提取标题（支持多行）
        local title_content
        title_content=$(awk '
            BEGIN { RS="</title>"; FS="<title>" }
            NR==1 { gsub(/[\n\r]/, " "); print $2; exit }
        ' "$layout_file")
        echo "提取标题: '$title_content'"

        # 提取正文内容（保留换行）
        local body_content
        body_content=$(sed -n '/<body>/,/<\/body>/ {
            /<body>/d; /<\/body>/d
            p
        }' "$layout_file" | sed ':a;N;$!ba;s/\n/\\n/g')

        # 执行替换操作
        awk -v title="$title_content" -v body="$body_content" '
            BEGIN {
                title_replaced = 0
                dynamic_replaced = 0
                body_replaced = 0
            }
            
            # 主标题替换
            /<title>[[:space:]]*这里替换标题[[:space:]]*<\/title>/ && !title_replaced {
                print "<title>" title "</title>"
                title_replaced = 1
                next
            }
            
            # 动态标题替换
            /<div[^>]*id="dynamic-title"[^>]*>[[:space:]]*这里替换标题2[[:space:]]*<\/div>/ && !dynamic_replaced {
                print "<div class=\"title-bar-text\" id=\"dynamic-title\">" title "</div>"
                dynamic_replaced = 1
                next
            }
            
            # 正文内容替换
            /<div[^>]*class="window-body"[^>]*>[[:space:]]*这里替换内容[[:space:]]*<\/div>/ && !body_replaced {
                gsub(/\\n/, "\n")  # 恢复换行符
                print "<div class=\"window-body\">" body "</div>"
                body_replaced = 1
                next
            }
            
            { print }
        ' "$index_file" | safe_replace "$index_file"

        echo "内容替换成功完成"
        exit 0
    ) | awk -v dir="$dir" '{print "[" dir "] " $0}'  # 统一添加目录前缀
    return $?  # 返回子shell的退出状态
}

# ---------- 第三部分：并行处理 ----------
export -f process_directory safe_replace error_exit
export TEMPFILE_PATTERN SOURCE_FILE

echo "开始并行扫描子目录..."
find "$TARGET_DIRECTORY" -mindepth 1 -maxdepth 1 -type d -print0 | \
    xargs -0 -P$PARALLEL_JOBS -I{} bash -c 'process_directory "{}"'

echo -e "\n所有操作已完成"
read -p "按回车键退出..."