# ABOUTME: Script to start the reputation calculator background job
# ABOUTME: Handles process management and scheduling for daily reputation updates

import os
import sys
import signal
import logging
from pathlib import Path

# Add the parent directory to the path
sys.path.append(str(Path(__file__).parent.parent))

from jobs.reputationCalculator import ReputationCalculator, run_reputation_calculator
import schedule
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('reputation_calculator.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully."""
    logger.info("Received shutdown signal. Stopping reputation calculator...")
    sys.exit(0)

def main():
    """Main function to start the reputation calculator scheduler."""
    logger.info("Starting AniManga Reputation Calculator...")
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Schedule daily reputation calculation at 2:00 AM
        schedule.every().day.at("02:00").do(run_reputation_calculator)
        
        logger.info("Reputation calculator scheduled to run daily at 2:00 AM")
        logger.info("Running initial reputation calculation...")
        
        # Run initial calculation
        run_reputation_calculator()
        
        logger.info("Initial calculation completed. Starting scheduler...")
        
        # Keep the scheduler running
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
            
    except Exception as e:
        logger.error(f"Error in reputation calculator: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()