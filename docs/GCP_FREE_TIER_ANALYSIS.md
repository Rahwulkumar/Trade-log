# GCP Free Tier Analysis - Terminal Farm

## Question: Will We Stay in Free Tier?

**Short Answer**: 
- ✅ **YES** for 1-3 terminals with Cloud Run
- ❌ **NO** for 4+ terminals with Cloud Run (use Compute Engine instead)

## Free Tier Limits

### Cloud Run
- **Requests**: 2 million/month
- **GB-seconds**: 360,000/month
- **vCPU-seconds**: 180,000/month
- **Always Free**: First 2M requests, 360K GB-seconds, 180K vCPU-seconds

### Compute Engine
- **e2-micro VM**: 1 instance always free (1 vCPU, 1GB RAM)
- **30GB disk**: Always free
- **Network egress**: 1GB/month free

### Cloud Scheduler
- **3 jobs**: Always free
- **Unlimited executions**: Always free

## Cost Breakdown

### Scenario 1: Cloud Run (1 Terminal)

**Orchestrator:**
- Runs: 43,200 times/month (every 60s)
- Usage: 21,600 GB-seconds, 21,600 vCPU-seconds
- **Status**: ✅ FREE (5% of limit)

**MT5 Terminal Service:**
- Heartbeats: 86,400 requests/month (every 30s)
- Usage: 345,600 GB-seconds, 86,400 vCPU-seconds
- **Status**: ⚠️ **SLIGHTLY OVER** GB-seconds limit (96% of limit)

**Total: 1 Terminal**
- GB-seconds: 367,200 (102% of limit) ❌
- vCPU-seconds: 108,000 (60% of limit) ✅
- **Cost**: ~$0.50/month (just over free tier)

### Scenario 2: Cloud Run (3 Terminals)

**Orchestrator:**
- Same as above: 21,600 GB-seconds, 21,600 vCPU-seconds

**MT5 Terminal Services:**
- Heartbeats: 259,200 requests/month (3 terminals)
- Usage: 1,036,800 GB-seconds, 259,200 vCPU-seconds
- **Status**: ❌ **WAY OVER** limits

**Total: 3 Terminals**
- GB-seconds: 1,058,400 (294% of limit) ❌
- vCPU-seconds: 367,800 (204% of limit) ❌
- **Cost**: ~$15-20/month

### Scenario 3: Compute Engine (10 Terminals)

**Single e2-micro VM:**
- Runs all 10 terminals in Docker
- **Cost**: $0/month (always free tier)
- **Limitations**: 
  - 1 vCPU, 1GB RAM (need swap for MT5)
  - Less scalable than Cloud Run
  - Single point of failure

**Total: 10 Terminals**
- **Cost**: $0/month ✅
- **Trade-off**: Less scalable, manual management

## Recommendations

### For 1-3 Terminals: Cloud Run (with optimization)

**Optimization 1: Reduce Heartbeat Frequency**
```python
# In EA, change heartbeat from 30s to 2 minutes
heartbeat_interval = 120  # seconds
```

**Result:**
- 1 terminal: 43,200 requests/month = 172,800 GB-seconds ✅ (within limit)
- 3 terminals: 129,600 requests/month = 518,400 GB-seconds ❌ (still over)

**Optimization 2: Use Smaller Container**
```dockerfile
# Reduce memory from 2GB to 1GB
resources:
  limits:
    memory: 1Gi  # Instead of 2Gi
```

**Result:**
- 1 terminal: 172,800 GB-seconds → 86,400 GB-seconds ✅
- 3 terminals: 518,400 GB-seconds → 259,200 GB-seconds ✅

### For 4+ Terminals: Compute Engine

**Why Compute Engine?**
- Always free tier (1 e2-micro VM)
- Can run multiple terminals in Docker
- No per-request costs
- Better for cost optimization

**Setup:**
```bash
# Create free tier VM
gcloud compute instances create terminal-farm \
    --machine-type=e2-micro \
    --zone=us-central1-a \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud

# Install Docker and run terminals
# (See deploy-gcp.sh in tradetaper/terminal-farm)
```

## Cost Comparison

| Terminals | Cloud Run | Compute Engine | Recommendation |
|-----------|-----------|----------------|----------------|
| 1 | ~$0.50/month | $0/month | Compute Engine |
| 3 | ~$15/month | $0/month | Compute Engine |
| 5 | ~$30/month | $0/month | Compute Engine |
| 10 | ~$60/month | $0/month | Compute Engine |

## Hybrid Approach (Best of Both Worlds)

**For Maximum Cost Efficiency:**
1. Use **Compute Engine** for terminal containers (always free)
2. Use **Cloud Run** for orchestrator (stays in free tier)
3. Use **Cloud Scheduler** to trigger orchestrator (always free)

**Architecture:**
```
Cloud Scheduler (Free)
    ↓
Cloud Run Orchestrator (Free - 21K GB-seconds)
    ↓
Compute Engine VM (Free - e2-micro)
    ├── Terminal 1 (Docker)
    ├── Terminal 2 (Docker)
    └── Terminal 10 (Docker)
```

**Total Cost: $0/month** ✅

## Conclusion

**Answer to "Would we be inside the free tier itself?"**

- **Cloud Run Only**: ❌ NO (for 4+ terminals)
- **Compute Engine Only**: ✅ YES (always free)
- **Hybrid (Orchestrator on Cloud Run + Terminals on Compute Engine)**: ✅ YES (always free)

**Recommendation**: Use **Compute Engine** for terminals, **Cloud Run** for orchestrator. This gives you:
- ✅ $0/month cost
- ✅ Scalable orchestrator
- ✅ Reliable terminal hosting
- ✅ Best of both worlds

## Next Steps

1. **For 1-3 terminals**: Use Cloud Run with reduced heartbeat frequency
2. **For 4+ terminals**: Use Compute Engine (free tier)
3. **For production**: Use hybrid approach (orchestrator on Cloud Run, terminals on Compute Engine)
