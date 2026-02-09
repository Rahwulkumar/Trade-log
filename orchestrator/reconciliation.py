"""
Terminal reconciliation logic
Compares desired state (from API) with actual state (Docker containers)
"""

import logging
from typing import List, Dict
import requests
from docker_client import DockerClient
from config import Config

logger = logging.getLogger(__name__)

class ReconciliationService:
    """Handles terminal reconciliation"""
    
    def __init__(self, docker_client: DockerClient):
        self.docker = docker_client
    
    def get_desired_terminals(self) -> List[Dict]:
        """Fetch desired terminal state from Trading Journal API"""
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                url = f"{Config.TRADING_JOURNAL_URL}/api/orchestrator/config"
                headers = {
                    'x-orchestrator-secret': Config.ORCHESTRATOR_SECRET
                }
                
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                
                configs = response.json()
                
                # Validate response is a list
                if not isinstance(configs, list):
                    logger.error(f"API returned non-list response: {type(configs)}")
                    return []
                
                logger.info(f"Fetched {len(configs)} terminal configs from API")
                return configs
                
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    logger.warning(f"API call failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying...")
                    import time
                    time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                else:
                    logger.error(f"Error fetching terminal configs after {max_retries} attempts: {e}")
                    return []
            except Exception as e:
                logger.error(f"Unexpected error fetching configs: {e}")
                return []
        
        return []
    
    def reconcile(self) -> Dict[str, int]:
        """Reconcile desired state with actual state"""
        stats = {
            'created': 0,
            'stopped': 0,
            'updated': 0,
            'errors': 0
        }
        
        # Get desired state from API
        desired_configs = self.get_desired_terminals()
        
        # Get actual state from Docker
        running_containers = self.docker.get_running_containers()
        
        # Create set of desired terminal IDs
        desired_terminal_ids = set()
        terminals_to_create = []
        terminals_to_stop = []
        
        for config in desired_configs:
            terminal_id = config.get('id')
            status = config.get('status', 'RUNNING')
            
            if not terminal_id:
                logger.warning("Skipping config entry with missing 'id' field")
                continue
            
            desired_terminal_ids.add(terminal_id)
            
            if status == 'RUNNING':
                # Should be running
                if terminal_id not in running_containers:
                    logger.info(f"Terminal {terminal_id} should be running but container not found")
                    terminals_to_create.append(config)
                else:
                    logger.debug(f"Terminal {terminal_id} is already running")
            elif status == 'STOPPED':
                # Should be stopped
                if terminal_id in running_containers:
                    logger.info(f"Terminal {terminal_id} should be stopped but container is running")
                    terminals_to_stop.append(terminal_id)
                else:
                    logger.debug(f"Terminal {terminal_id} is already stopped")
        
        # Find orphaned containers (running but not in desired state)
        for container_id in running_containers:
            if container_id not in desired_terminal_ids:
                logger.info(f"Found orphaned container: {container_id} (not in desired state)")
                terminals_to_stop.append(container_id)
        
        # Create missing containers
        for config in terminals_to_create:
            terminal_id = config.get('id')
            if not terminal_id:
                logger.warning("Skipping config with missing terminal ID")
                continue
            
            try:
                if self.docker.create_container(terminal_id, config):
                    stats['created'] += 1
                    logger.info(f"Created/started container for terminal: {terminal_id}")
                else:
                    stats['errors'] += 1
                    logger.error(f"Failed to create container for terminal: {terminal_id}")
            except Exception as e:
                stats['errors'] += 1
                logger.error(f"Error creating container for {terminal_id}: {e}", exc_info=True)
        
        # Stop unwanted containers
        for terminal_id in terminals_to_stop:
            if not terminal_id:
                continue
            logger.info(f"Processing terminal {terminal_id}: needs to be stopped")
            try:
                if self.docker.stop_container(terminal_id):
                    stats['stopped'] += 1
                    logger.info(f"Successfully stopped container for terminal: {terminal_id}")
                else:
                    stats['errors'] += 1
                    logger.error(f"Failed to stop container for terminal: {terminal_id}")
            except Exception as e:
                stats['errors'] += 1
                logger.error(f"Error stopping container for {terminal_id}: {e}", exc_info=True)
        
        logger.info(f"Reconciliation complete: {stats}")
        return stats
