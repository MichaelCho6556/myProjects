#!/usr/bin/env python3
"""
Quality Score Calculator Startup Script

This script provides a convenient way to run the quality score calculator
as a background job or scheduled task.

Usage:
    python scripts/start_quality_calculator.py [--hours-back 24]

Options:
    --hours-back: Number of hours back to look for updated lists (default: 24)

Example:
    python scripts/start_quality_calculator.py --hours-back 48
"""

import sys
import os
import argparse
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.quality_score_calculator import QualityScoreCalculator

def main():
    """Main function for the quality score calculator startup script."""
    parser = argparse.ArgumentParser(description='Run the quality score calculator')
    parser.add_argument(
        '--hours-back', 
        type=int, 
        default=24,
        help='Number of hours back to look for updated lists (default: 24)'
    )
    
    args = parser.parse_args()
    
    print(f"Starting Quality Score Calculator at {datetime.now()}")
    print(f"Processing lists updated in the last {args.hours_back} hours")
    
    try:
        calculator = QualityScoreCalculator()
        result = calculator.process_lists(hours_back=args.hours_back)
        
        print(f"\nQuality Score Calculator Results:")
        print(f"  Processed: {result['processed']}")
        print(f"  Updated: {result['updated']}")
        print(f"  Errors: {result['errors']}")
        
        if result['errors'] > 0:
            print(f"\nWarning: {result['errors']} errors occurred during processing")
            sys.exit(1)
        else:
            print(f"\nQuality score calculation completed successfully!")
            sys.exit(0)
            
    except Exception as e:
        print(f"Fatal error in quality score calculator: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()