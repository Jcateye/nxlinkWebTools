#!/bin/bash
# 日志监控脚本 - 用于定时检查和处理日志文件
# 可以添加到 crontab 中定期执行

# 配置参数
APP_DIR="/Users/haoqi/Work/nxlinkWebTools"
LOG_FILE="$APP_DIR/logs/monitor.log"
ALERT_EMAIL="admin@example.com"  # 可选：告警邮件地址

# 创建日志目录
mkdir -p "$APP_DIR/logs"

# 记录监控开始时间
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始日志监控" >> "$LOG_FILE"

# 切换到应用目录
cd "$APP_DIR"

# 执行日志管理
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 执行日志管理..." >> "$LOG_FILE"
/bin/bash log-manager.sh >> "$LOG_FILE" 2>&1

# 检查日志文件大小是否异常
TOTAL_SIZE=$(du -sm logs/ 2>/dev/null | cut -f1)
if [ "$TOTAL_SIZE" -gt 1000 ]; then  # 如果超过1GB
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ 警告：日志目录总大小超过1GB ($TOTAL_SIZE MB)" >> "$LOG_FILE"

    # 可选：发送告警邮件
    # echo "日志目录大小告警: $TOTAL_SIZE MB" | mail -s "日志大小告警" $ALERT_EMAIL
fi

# 检查是否有新的错误日志
if [ -f "logs/error.log" ] && [ -s "logs/error.log" ]; then
    ERROR_COUNT=$(wc -l < logs/error.log)
    if [ "$ERROR_COUNT" -gt 100 ]; then  # 如果错误日志行数超过100行
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ 警告：错误日志行数过多 ($ERROR_COUNT 行)" >> "$LOG_FILE"
    fi
fi

# 记录监控结束时间
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 日志监控完成" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 可选：清理监控日志文件（保留最近7天的记录）
find "$APP_DIR/logs" -name "monitor.log.*" -mtime +7 -delete 2>/dev/null || true
