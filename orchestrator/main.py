#!/usr/bin/env python3
"""
Terminal Farm Orchestrator
Polls Trading Journal API and manages Docker containers for MT5 terminals
"""

import sys
import logging
from config import Config
from docker_client import DockerClient
from reconciliation import ReconciliationService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main orchestrator function"""
    logger.info("=== Terminal Farm Orchestrator Starting ===")
    
    # Validate configuration
    missing = Config.validate()
    if missing:
        logger.error(f"Missing required configuration: {', '.join(missing)}")
        logger.error("Please set the following environment variables:")
        for var in missing:
            logger.error(f"  - {var}")
        sys.exit(1)
    
    logger.info(f"Trading Journal URL: {Config.TRADING_JOURNAL_URL}")
    logger.info(f"Docker Host: {Config.VM_DOCKER_HOST}")
    
    try:
        # Initialize Docker client
        logger.info("Connecting to Docker...")
        docker_client = DockerClient()
        
        # Initialize reconciliation service
        reconciliation = ReconciliationService(docker_client)
        
        # Perform reconciliation
        logger.info("Starting reconciliation...")
        stats = reconciliation.reconcile()
        
        # Log results
        logger.info("=== Reconciliation Results ===")
        logger.info(f"Created: {stats['created']}")
        logger.info(f"Stopped: {stats['stopped']}")
        logger.info(f"Updated: {stats['updated']}")
        logger.info(f"Errors: {stats['errors']}")
        
        if stats['errors'] > 0:
            logger.warning("Some operations had errors. Check logs above.")
            sys.exit(1)
        else:
            logger.info("Reconciliation completed successfully")
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
