#!/bin/bash
# Quality Score Calculator Cron Job Script
# 
# This script is designed to be run as a cron job to periodically
# update quality scores and preview images for custom lists.
#
# Recommended cron schedule:
# # Run every hour
# 0 * * * * /path/to/your/project/backend/scripts/quality_score_cron.sh
#
# # Run every 6 hours
# 0 */6 * * * /path/to/your/project/backend/scripts/quality_score_cron.sh

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the project directory
cd "$PROJECT_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set up logging
LOG_FILE="$PROJECT_DIR/logs/quality_score_calculator.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Run the quality score calculator
echo "$(date): Starting quality score calculator" >> "$LOG_FILE"
python3 scripts/start_quality_calculator.py --hours-back 24 >> "$LOG_FILE" 2>&1

# Log completion
if [ $? -eq 0 ]; then
    echo "$(date): Quality score calculator completed successfully" >> "$LOG_FILE"
else
    echo "$(date): Quality score calculator failed with exit code $?" >> "$LOG_FILE"
fi

# Optional: Clean up old log files (keep last 30 days)
find "$PROJECT_DIR/logs" -name "quality_score_calculator.log.*" -mtime +30 -delete 2>/dev/null || true