#!/bin/bash
# Security Monitoring Script
# Run this periodically via cron: */5 * * * * /path/to/security-monitor.sh

set -euo pipefail

LOG_FILE="/var/log/security-monitor.log"
ALERT_EMAIL="admin@example.com"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

alert() {
    local message="$1"
    log "ALERT: $message"

    # Send email alert
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "Security Alert - $(hostname)" "$ALERT_EMAIL"
    fi

    # Send Discord webhook
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -X POST "$DISCORD_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"🚨 **Security Alert**\n$message\"}" \
            2>/dev/null || true
    fi
}

# Check for malware processes
check_malware() {
    log "Checking for malware processes..."

    # Check for suspicious process names
    if ps aux | grep -E "wget|curl|nc|logic\.sh|nigger\.sh" | grep -v grep | grep -v security-monitor; then
        alert "Suspicious processes detected on $(hostname)!"
    fi

    # Check for zombie processes (malware remnants)
    zombie_count=$(ps aux | grep defunct | grep -v grep | wc -l)
    if [ "$zombie_count" -gt 5 ]; then
        alert "High number of zombie processes detected: $zombie_count"
    fi
}

# Check for suspicious network connections
check_network() {
    log "Checking network connections..."

    # Known malicious IPs from the attack
    malicious_ips=("91.92.241.10" "193.142.147.209")

    for ip in "${malicious_ips[@]}"; do
        if netstat -an | grep "$ip" 2>/dev/null; then
            alert "Connection to known malicious IP detected: $ip"
        fi
    done

    # Check for suspicious ports
    if netstat -tulpn 2>/dev/null | grep -E ":12323|:4444|:31337"; then
        alert "Suspicious port usage detected (common backdoor ports)"
    fi
}

# Check Docker containers
check_docker() {
    log "Checking Docker containers..."

    # Check if containers are running
    for container in ansa-dashboard-1 ansa-api-1 ansa-postgres-1; do
        if ! docker ps --format '{{.Names}}' | grep -q "$container"; then
            alert "Container $container is not running!"
        fi
    done

    # Check container resource usage
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | while read -r line; do
        cpu=$(echo "$line" | awk '{print $2}' | tr -d '%')
        if [ "${cpu%.*}" -gt 80 ] 2>/dev/null; then
            alert "High CPU usage detected: $line"
        fi
    done
}

# Check for suspicious files
check_files() {
    log "Checking for suspicious files..."

    # Check /tmp for recent files
    find /tmp -type f -mtime -1 -ls 2>/dev/null | grep -E "\.sh$|logic|nigger" && \
        alert "Suspicious files found in /tmp"

    # Check for unauthorized cron jobs
    for user in $(cut -d: -f1 /etc/passwd); do
        crontab -u "$user" -l 2>/dev/null | grep -v "^#" | grep -E "wget|curl|nc" && \
            alert "Suspicious cron job found for user $user"
    done
}

# Check Docker logs for attack patterns
check_logs() {
    log "Checking Docker logs for attack patterns..."

    # Check last 100 lines for attack patterns
    if docker logs --tail 100 ansa-dashboard-1 2>&1 | grep -E "wget|curl.*91\.92\.241\.10|nc.*193\.142\.147"; then
        attack_count=$(docker logs --tail 1000 ansa-dashboard-1 2>&1 | grep -c "wget" || echo 0)
        if [ "$attack_count" -gt 10 ]; then
            alert "Active attack detected! $attack_count attempts in recent logs"
        fi
    fi
}

# Check system integrity
check_integrity() {
    log "Checking system integrity..."

    # Check if important files have been modified
    if [ -f "/etc/passwd.bak" ]; then
        if ! diff -q /etc/passwd /etc/passwd.bak >/dev/null 2>&1; then
            alert "/etc/passwd has been modified!"
        fi
    else
        cp /etc/passwd /etc/passwd.bak
    fi
}

# Main execution
main() {
    log "Starting security monitoring check..."

    check_malware
    check_network
    check_docker
    check_files
    check_logs
    check_integrity

    log "Security monitoring check completed"
}

# Run main function
main

# Rotate log file if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt 10485760 ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    log "Log file rotated"
fi
