#!/bin/bash
# Git提交和推送脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}提交安全清理更改${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查Git状态
echo -e "${YELLOW}当前Git状态:${NC}"
git status --short
echo ""

# 显示将要提交的文件
echo -e "${YELLOW}将要提交的更改:${NC}"
echo ""
echo -e "${GREEN}已修改的文件:${NC}"
echo "  ✓ db_manager.py - 移除邮件API后门"
echo "  ✓ reply_server.py - 移除版本检查外部连接"
echo "  ✓ global_config.yml - 禁用外部API"
echo ""
echo -e "${GREEN}新增的文件:${NC}"
echo "  ✓ SECURITY_CLEANUP_REPORT.md - 详细清理报告"
echo "  ✓ 安全清理说明.md - 中文使用说明"
echo "  ✓ check_security.sh - 安全检查脚本"
echo "  ✓ build-and-push.sh - Docker构建推送脚本"
echo "  ✓ Docker构建推送指南.md - Docker使用说明"
echo "  ✓ README-SECURITY.md - 安全版本说明"
echo "  ✓ .github/workflows/docker-build.yml - GitHub Actions工作流"
echo ""

# 询问是否继续
read -p "是否继续提交? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消${NC}"
    exit 0
fi

# 添加所有更改
echo -e "${BLUE}添加文件到Git...${NC}"
git add .

# 提交更改
echo -e "${BLUE}提交更改...${NC}"
git commit -m "Security: 移除所有数据上报后门

- 移除邮件验证码API后门 (db_manager.py)
  - 删除 _send_email_via_api() 函数
  - 现在仅支持用户自己配置的SMTP服务器

- 移除版本检查外部连接 (reply_server.py)
  - 改为从本地文件读取版本信息
  - 不再连接作者服务器

- 禁用外部商品API (global_config.yml)
  - 禁用外部商品详情API

- 添加安全文档和工具
  - SECURITY_CLEANUP_REPORT.md - 详细清理报告
  - 安全清理说明.md - 中文使用说明
  - check_security.sh - 安全检查脚本
  - build-and-push.sh - Docker构建推送脚本
  - Docker构建推送指南.md - Docker使用说明
  - README-SECURITY.md - 安全版本说明

- 添加GitHub Actions工作流
  - 自动构建多架构Docker镜像
  - 自动推送到GHCR

所有数据上报后门已被完全移除，用户数据安全得到保障。

验证方法: ./check_security.sh
详细报告: SECURITY_CLEANUP_REPORT.md"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 提交成功${NC}"
else
    echo -e "${RED}✗ 提交失败${NC}"
    exit 1
fi
echo ""

# 推送到远程仓库
echo -e "${BLUE}推送到GitHub...${NC}"
echo ""

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "当前分支: ${CURRENT_BRANCH}"
echo ""

read -p "是否推送到远程仓库? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已跳过推送${NC}"
    echo ""
    echo -e "${YELLOW}提示: 稍后可以手动推送${NC}"
    echo "  git push origin ${CURRENT_BRANCH}"
    exit 0
fi

git push origin ${CURRENT_BRANCH}

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✓ 推送成功！${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo ""
    echo "1. 查看GitHub Actions构建状态:"
    echo "   https://github.com/Pama-Lee/xianyu/actions"
    echo ""
    echo "2. 等待镜像构建完成后，查看镜像:"
    echo "   https://github.com/Pama-Lee/xianyu/pkgs/container/xianyu"
    echo ""
    echo "3. 或者手动构建镜像:"
    echo "   ./build-and-push.sh"
    echo ""
else
    echo -e "${RED}✗ 推送失败${NC}"
    echo ""
    echo -e "${YELLOW}可能的原因:${NC}"
    echo "  - 网络问题"
    echo "  - 权限不足"
    echo "  - 分支保护规则"
    echo ""
    echo -e "${YELLOW}请检查后重试:${NC}"
    echo "  git push origin ${CURRENT_BRANCH}"
    exit 1
fi

