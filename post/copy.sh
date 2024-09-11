#!/bin/bash

# 源文件路径（相对路径）
SOURCE_FILE="index.html"

# 目标目录路径（相对路径）
TARGET_DIRECTORY="."

# 检查源文件是否存在
echo "检查源文件是否存在：$SOURCE_FILE"
if [ ! -f "$SOURCE_FILE" ]; then
    echo "错误：源文件 $SOURCE_FILE 不存在。"
    read -p "按回车键退出..."
    exit 1
else
    echo "源文件存在。"
fi

# 检查目标目录是否存在
echo "检查目标目录是否存在：$TARGET_DIRECTORY"
if [ ! -d "$TARGET_DIRECTORY" ]; then
    echo "错误：目标目录 $TARGET_DIRECTORY 不存在。"
    read -p "按回车键退出..."
    exit 1
else
    echo "目标目录存在。"
fi

# 遍历目标目录下的所有子文件夹
echo "开始遍历目标目录的子文件夹..."
for dir in "$TARGET_DIRECTORY"/*/; do
    # 检查是否为目录
    if [ -d "$dir" ]; then
        echo "当前目录：$dir"
        # 复制文件到子文件夹
        cp "$SOURCE_FILE" "$dir" && echo "成功复制 $SOURCE_FILE 到 $dir" || echo "失败：无法复制 $SOURCE_FILE 到 $dir"
    else
        echo "跳过（不是目录）：$dir"
    fi
done

# 等待用户按下回车键
read -p "按回车键退出..."
