#!/bin/bash

# 源文件路径（相对路径）
SOURCE_FILE="index.html"

# 目标目录路径（相对路径）
TARGET_DIRECTORY="."

# 检查源文件是否存在
if [ ! -f "$SOURCE_FILE" ]; then
    echo "错误：源文件 $SOURCE_FILE 不存在。"
    read -p "按回车键退出..."
    exit 1
fi

# 检查目标目录是否存在
if [ ! -d "$TARGET_DIRECTORY" ]; then
    echo "错误：目标目录 $TARGET_DIRECTORY 不存在。"
    read -p "按回车键退出..."
    exit 1
fi

# 遍历目标目录下的所有子文件夹并复制文件
echo "开始遍历目标目录的子文件夹..."
for dir in "$TARGET_DIRECTORY"/*/; do
    if [ -d "$dir" ]; then
        cp "$SOURCE_FILE" "$dir" && echo "成功复制 $SOURCE_FILE 到 $dir" || echo "失败：无法复制 $SOURCE_FILE 到 $dir"
    fi
done

# 生成新的JavaScript代码片段
NEW_LINKS=""
NEW_ID=10000  # 初始id为10000
for dir in "$TARGET_DIRECTORY"/*/; do
    if [ -d "$dir" ]; then
        dir=${dir%/}  # 去掉末尾的斜杠
        dir=${dir#./}  # 去掉开头的 './'
        NEW_LINKS+="        { id: $NEW_ID, url: '/post/$dir' },\n"
        NEW_ID=$((NEW_ID + 100))  # 每一个新的链接在百位数上进1
    fi
done

# 输出即将插入的代码到txt文件
NEW_LINKS_FILE="new_links.txt"
echo -e "$NEW_LINKS" > "$NEW_LINKS_FILE"
echo "即将插入的代码已保存到 $NEW_LINKS_FILE 文件。"

# 等待用户按下回车键
read -p "按回车键退出..."
