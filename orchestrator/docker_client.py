"""
Docker API client wrapper for managing terminal containers
"""

import os
import docker
from typing import Optional, List, Dict
import logging
from config import Config

logger = logging.getLogger(__name__)

class DockerClient:
    """Wrapper for Docker API client"""
    
    def __init__(self):
        """Initialize Docker client"""
        try:
            docker_config = Config.get_docker_config()
            
            if docker_config.get('tls'):
                # TLS connection
                tls_config = docker.tls.TLSConfig(
                    client_cert=(docker_config['tls_cert'], docker_config['tls_key']),
                    ca_cert=docker_config['tls_ca'],
                    verify=True
                )
                self.client = docker.DockerClient(
                    base_url=docker_config['base_url'],
                    tls=tls_config
                )
            else:
                # Non-TLS connection (for local testing)
                self.client = docker.DockerClient(base_url=docker_config['base_url'])
            
            # Test connection
            self.client.ping()
            logger.info("Docker client connected successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Docker: {e}")
            raise
    
    def get_container_name(self, terminal_id: str) -> str:
        """Get container name for terminal ID"""
        return f"mt5-terminal-{terminal_id}"
    
    def container_exists(self, terminal_id: str) -> bool:
        """Check if container exists"""
        try:
            container_name = self.get_container_name(terminal_id)
            self.client.containers.get(container_name)
            return True
        except docker.errors.NotFound:
            return False
        except Exception as e:
            logger.error(f"Error checking container existence: {e}")
            return False
    
    def get_running_containers(self) -> List[str]:
        """Get list of running terminal container IDs"""
        try:
            # Get all containers (running and stopped) with our naming pattern
            all_containers = self.client.containers.list(all=True)
            
            # Extract terminal IDs from container names
            terminal_ids = []
            for container in all_containers:
                name = container.name
                if name.startswith('mt5-terminal-') and container.status == 'running':
                    terminal_id = name.replace('mt5-terminal-', '')
                    terminal_ids.append(terminal_id)
            return terminal_ids
        except Exception as e:
            logger.error(f"Error getting running containers: {e}")
            return []
    
    def create_container(self, terminal_id: str, config: Dict) -> bool:
        """Create a new terminal container or restart existing one"""
        container_name = self.get_container_name(terminal_id)
        
        # Validate required config fields
        required_fields = ['server', 'login', 'password']
        for field in required_fields:
            if not config.get(field):
                logger.error(f"Missing required field '{field}' in config for terminal {terminal_id}")
                return False
        
        # Check if container already exists
        try:
            existing_container = self.client.containers.get(container_name)
            # Container exists - check status
            if existing_container.status == 'running':
                logger.info(f"Container {container_name} already running")
                return True
            elif existing_container.status in ['exited', 'stopped', 'created']:
                # Restart existing container
                logger.info(f"Restarting existing container: {container_name}")
                try:
                    existing_container.start()
                    logger.info(f"Restarted container: {container_name}")
                    return True
                except Exception as e:
                    logger.error(f"Failed to restart container {container_name}: {e}")
                    # Remove and recreate
                    existing_container.remove(force=True)
            else:
                # Remove container in bad state and create new one
                logger.warning(f"Container {container_name} in state {existing_container.status}, removing and recreating")
                existing_container.remove(force=True)
        except docker.errors.NotFound:
            # Container doesn't exist, will create new one
            pass
        except Exception as e:
            logger.error(f"Error checking existing container: {e}")
            return False
        
        # Create new container
        try:
            # Environment variables
            # Note: API_KEY should be TERMINAL_WEBHOOK_SECRET (different from ORCHESTRATOR_SECRET)
            # This is passed to the EA for webhook authentication
            env_vars = {
                'MT5_SERVER': config.get('server', ''),
                'MT5_LOGIN': config.get('login', ''),
                'MT5_PASSWORD': config.get('password', ''),
                'TERMINAL_ID': terminal_id,
                'API_ENDPOINT': Config.TRADING_JOURNAL_URL,
                'API_KEY': Config.TERMINAL_WEBHOOK_SECRET,  # Webhook secret for EA
            }
            
            # Create container
            container = self.client.containers.create(
                image=Config.TERMINAL_IMAGE,
                name=container_name,
                environment=env_vars,
                detach=True,
                restart_policy={"Name": "unless-stopped"},
                mem_limit='1g',  # Limit memory to 1GB per container
            )
            
            # Start container
            try:
                container.start()
                logger.info(f"Created and started container: {container_name}")
                return True
            except Exception as start_error:
                # If start fails, remove the container
                logger.error(f"Failed to start container {container_name}: {start_error}")
                try:
                    container.remove(force=True)
                except:
                    pass
                return False
            
        except docker.errors.ImageNotFound:
            logger.error(f"Image not found: {Config.TERMINAL_IMAGE}")
            return False
        except docker.errors.APIError as e:
            logger.error(f"Docker API error creating container: {e}")
            return False
        except Exception as e:
            logger.error(f"Error creating container: {e}")
            return False
    
    def stop_container(self, terminal_id: str) -> bool:
        """Stop and remove a terminal container"""
        try:
            container_name = self.get_container_name(terminal_id)
            container = self.client.containers.get(container_name)
            
            # Stop container
            container.stop(timeout=10)
            
            # Remove container
            container.remove()
            
            logger.info(f"Stopped and removed container: {container_name}")
            return True
            
        except docker.errors.NotFound:
            logger.warning(f"Container not found: {container_name}")
            return True  # Already removed
        except Exception as e:
            logger.error(f"Error stopping container: {e}")
            return False
    
    def get_container_status(self, terminal_id: str) -> Optional[str]:
        """Get container status (running, stopped, etc.)"""
        try:
            container_name = self.get_container_name(terminal_id)
            container = self.client.containers.get(container_name)
            return container.status
        except docker.errors.NotFound:
            return None
        except Exception as e:
            logger.error(f"Error getting container status: {e}")
            return None
