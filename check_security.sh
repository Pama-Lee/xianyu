#!/bin/bash
# 安全检查脚本 - 检查是否存在数据上报后门

echo "================================"
echo "闲鱼自动回复系统 - 安全检查"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查结果统计
ISSUES_FOUND=0

echo "1. 检查可疑域名..."
echo "--------------------------------"

# 检查可疑域名（排除文档和编译后的文件）
SUSPICIOUS_DOMAINS=(
    "zhinianblog.cn"
    "zhinianboke.com"
    "dy.zhinianboke.com"
    "selfapi.zhinianboke.com"
    "notice.zhinianblog.cn"
    "xianyu.zhinianblog.cn"
)

for domain in "${SUSPICIOUS_DOMAINS[@]}"; do
    echo -n "检查域名: $domain ... "
    
    # 搜索域名，排除文档、编译文件、node_modules等
    results=$(grep -r "$domain" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        --exclude-dir=build \
        --exclude="*.md" \
        --exclude="*.url" \
        --exclude="*.js.map" \
        --exclude="index-*.js" \
        --exclude="check_security.sh" \
        . 2>/dev/null)
    
    if [ -z "$results" ]; then
        echo -e "${GREEN}✓ 未发现${NC}"
    else
        echo -e "${RED}✗ 发现可疑代码${NC}"
        echo "$results" | head -n 3
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

echo ""
echo "2. 检查外部API调用..."
echo "--------------------------------"

# 检查Python文件中的外部HTTP请求
echo -n "检查Python文件中的外部请求 ... "
EXTERNAL_REQUESTS=$(grep -r "https\?://[^/]*\(zhinian\|hsykj\)" \
    --include="*.py" \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    . 2>/dev/null | grep -v "goofish.com" | grep -v "aliyuncs.com" | grep -v "telegram.org" | grep -v "day.app")

if [ -z "$EXTERNAL_REQUESTS" ]; then
    echo -e "${GREEN}✓ 未发现可疑请求${NC}"
else
    echo -e "${RED}✗ 发现可疑请求${NC}"
    echo "$EXTERNAL_REQUESTS"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
echo "3. 检查关键函数..."
echo "--------------------------------"

# 检查是否存在已删除的函数
SUSPICIOUS_FUNCTIONS=(
    "_send_email_via_api"
    "_send_qq_notification"
    "report_user_count"
)

for func in "${SUSPICIOUS_FUNCTIONS[@]}"; do
    echo -n "检查函数: $func ... "
    
    # 搜索函数定义（不是注释）
    results=$(grep -r "def $func\|async def $func" \
        --include="*.py" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        . 2>/dev/null | grep -v "^[[:space:]]*#")
    
    if [ -z "$results" ]; then
        echo -e "${GREEN}✓ 已移除${NC}"
    else
        echo -e "${RED}✗ 仍然存在${NC}"
        echo "$results"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

echo ""
echo "4. 检查配置文件..."
echo "--------------------------------"

# 检查global_config.yml中的外部API
echo -n "检查global_config.yml ... "
if [ -f "global_config.yml" ]; then
    ITEM_DETAIL_ENABLED=$(grep -A 5 "ITEM_DETAIL:" global_config.yml | grep "enabled:" | grep "true")
    
    if [ -z "$ITEM_DETAIL_ENABLED" ]; then
        echo -e "${GREEN}✓ 外部API已禁用${NC}"
    else
        echo -e "${YELLOW}⚠ 外部API仍然启用${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo -e "${YELLOW}⚠ 配置文件不存在${NC}"
fi

echo ""
echo "================================"
echo "检查完成"
echo "================================"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ 未发现安全问题${NC}"
    echo ""
    echo "所有数据上报后门已被成功移除！"
    exit 0
else
    echo -e "${RED}✗ 发现 $ISSUES_FOUND 个潜在问题${NC}"
    echo ""
    echo "请检查上述问题并进行修复。"
    exit 1
fi

