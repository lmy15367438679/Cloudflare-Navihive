#!/bin/bash

# 1. 检查当前目录是否是 Git 仓库
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "提示: 当前目录不是一个 Git 仓库，请在 Git 项目根目录下运行此脚本。"
    exit 1
fi

# 2. 获取当前的 origin 地址
CURRENT_URL=$(git remote get-url origin 2>/dev/null)

if [ -z "$CURRENT_URL" ]; then
    echo "提示: 未找到名为 'origin' 的远程仓库地址。"
    exit 1
fi

echo "当前远程地址: $CURRENT_URL"

# 3. 判断是否已经是 SSH 格式
if [[ "$CURRENT_URL" =~ ^git@github\.com: ]]; then
    echo "无需转换: 该项目已经是 SSH 连接方式。"
    exit 0
fi

# 4. 解析并转换 HTTPS 地址为 SSH
# 支持格式: https://github.com/username/repo.git 或 https://github.com/username/repo
if [[ "$CURRENT_URL" =~ ^https://github\.com/([^/]+)/([^/.]+)(\.git)?$ ]]; then
    USER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
    NEW_URL="git@github.com:$USER/$REPO.git"

    # 修改远程地址
    git remote set-url origin "$NEW_URL"
    
    if [ $? -eq 0 ]; then
        echo "转换成功！新的 SSH 地址为: $NEW_URL"
    else
        echo "转换失败，请检查 Git 权限。"
    fi
else
    echo "解析失败: 无法识别的 HTTPS 地址格式，请手动修改。"
fi