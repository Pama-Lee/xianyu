#!/bin/bash
# Docker镜像构建和推送脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
GITHUB_USERNAME="Pama-Lee"
REPO_NAME="xianyu"
IMAGE_NAME="ghcr.io/${GITHUB_USERNAME}/${REPO_NAME}"
VERSION="2.2.0-security-cleaned"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Docker镜像构建和推送${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker未运行，请先启动Docker${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker正在运行${NC}"
echo ""

# 显示配置信息
echo -e "${YELLOW}配置信息:${NC}"
echo "  GitHub用户名: ${GITHUB_USERNAME}"
echo "  仓库名称: ${REPO_NAME}"
echo "  镜像名称: ${IMAGE_NAME}"
echo "  版本标签: ${VERSION}"
echo ""

# 询问是否继续
read -p "是否继续构建? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消${NC}"
    exit 0
fi

# 1. 构建镜像
echo -e "${BLUE}步骤 1/4: 构建Docker镜像...${NC}"
echo "这可能需要几分钟时间..."
echo ""

docker build \
    --platform linux/amd64 \
    -t ${IMAGE_NAME}:${VERSION} \
    -t ${IMAGE_NAME}:latest \
    -f Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 镜像构建成功${NC}"
else
    echo -e "${RED}✗ 镜像构建失败${NC}"
    exit 1
fi
echo ""

# 2. 测试镜像
echo -e "${BLUE}步骤 2/4: 测试镜像...${NC}"
docker images | grep ${REPO_NAME}
echo ""

# 3. 登录GitHub Container Registry
echo -e "${BLUE}步骤 3/4: 登录GitHub Container Registry...${NC}"
echo "请输入你的GitHub Personal Access Token (需要write:packages权限)"
echo "如何获取: https://github.com/settings/tokens/new"
echo ""

# 尝试使用已有的登录
if docker login ghcr.io --username ${GITHUB_USERNAME} --password-stdin < /dev/null 2>/dev/null; then
    echo -e "${GREEN}✓ 已登录${NC}"
else
    echo "请输入GitHub Token:"
    docker login ghcr.io --username ${GITHUB_USERNAME}
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ 登录失败${NC}"
        exit 1
    fi
fi
echo ""

# 4. 推送镜像
echo -e "${BLUE}步骤 4/4: 推送镜像到GitHub Container Registry...${NC}"
echo "推送 ${IMAGE_NAME}:${VERSION}"
docker push ${IMAGE_NAME}:${VERSION}

echo "推送 ${IMAGE_NAME}:latest"
docker push ${IMAGE_NAME}:latest

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✓ 镜像推送成功！${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo ""
    echo "  docker pull ${IMAGE_NAME}:latest"
    echo ""
    echo "  docker run -d \\"
    echo "    -p 8080:8080 \\"
    echo "    --restart always \\"
    echo "    -v \$PWD/xianyu-data:/app/data \\"
    echo "    --name xianyu-auto-reply \\"
    echo "    ${IMAGE_NAME}:latest"
    echo ""
    echo -e "${YELLOW}查看镜像:${NC}"
    echo "  https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/pkgs/container/${REPO_NAME}"
    echo ""
else
    echo -e "${RED}✗ 镜像推送失败${NC}"
    exit 1
fi

