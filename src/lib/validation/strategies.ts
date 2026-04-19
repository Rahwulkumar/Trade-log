import {
  parsePlaybookCreatePayload,
  parsePlaybookUpdatePayload,
} from '@/lib/validation/playbooks';

export const parseStrategyCreatePayload = parsePlaybookCreatePayload;
export const parseStrategyUpdatePayload = parsePlaybookUpdatePayload;
