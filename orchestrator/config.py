"""
Configuration management for Terminal Farm Orchestrator
"""

import os
from typing import Optional

class Config:
    """Orchestrator configuration"""
    
    # Trading Journal API
    TRADING_JOURNAL_URL: str = os.getenv('TRADING_JOURNAL_URL', '')
    ORCHESTRATOR_SECRET: str = os.getenv('ORCHESTRATOR_SECRET', '')
    
    # VM Docker Configuration
    VM_DOCKER_HOST: str = os.getenv('VM_DOCKER_HOST', '')
    VM_DOCKER_CERT_PATH: Optional[str] = os.getenv('VM_DOCKER_CERT_PATH', None)
    VM_DOCKER_TLS_VERIFY: bool = os.getenv('VM_DOCKER_TLS_VERIFY', 'true').lower() == 'true'
    
    # GCP Configuration
    GCP_PROJECT_ID: str = os.getenv('GCP_PROJECT_ID', '')
    GCP_REGION: str = os.getenv('GCP_REGION', 'us-central1')
    
    # Container Image
    TERMINAL_IMAGE: str = os.getenv('TERMINAL_IMAGE', 'gcr.io/PROJECT_ID/mt5-terminal:latest')
    
    # Terminal Webhook Secret (for EA authentication)
    TERMINAL_WEBHOOK_SECRET: str = os.getenv('TERMINAL_WEBHOOK_SECRET', '')
    
    # Polling interval (seconds)
    POLL_INTERVAL: int = int(os.getenv('POLL_INTERVAL', '60'))
    
    @classmethod
    def validate(cls) -> list[str]:
        """Validate configuration and return list of missing required variables"""
        missing = []
        
        if not cls.TRADING_JOURNAL_URL:
            missing.append('TRADING_JOURNAL_URL')
        
        if not cls.ORCHESTRATOR_SECRET:
            missing.append('ORCHESTRATOR_SECRET')
        
        if not cls.VM_DOCKER_HOST:
            missing.append('VM_DOCKER_HOST')
        
        if not cls.TERMINAL_WEBHOOK_SECRET:
            missing.append('TERMINAL_WEBHOOK_SECRET')
        
        return missing
    
    @classmethod
    def get_docker_config(cls) -> dict:
        """Get Docker client configuration"""
        config = {
            'base_url': cls.VM_DOCKER_HOST,
        }
        
        if cls.VM_DOCKER_TLS_VERIFY and cls.VM_DOCKER_CERT_PATH:
            config['tls'] = True
            config['tls_cert'] = os.path.join(cls.VM_DOCKER_CERT_PATH, 'cert.pem')
            config['tls_key'] = os.path.join(cls.VM_DOCKER_CERT_PATH, 'key.pem')
            config['tls_ca'] = os.path.join(cls.VM_DOCKER_CERT_PATH, 'ca.pem')
        
        return config
