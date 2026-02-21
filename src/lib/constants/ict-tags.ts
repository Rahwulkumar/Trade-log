// ICT-focused predefined tags for trade annotation

export const ICT_SETUP_TAGS = [
  "FVG Entry",
  "iFVG Entry",
  "OB Entry",
  "OB Retest",
  "Breaker Block",
  "Mitigation Block",
  "Liquidity Sweep",
  "SSL Grab",
  "BSL Grab",
  "MSS Entry",
  "CHoCH Entry",
  "BOS Continuation",
  "Displacement Entry",
  "FVG + OB Combo",
  "Premium Zone",
  "Discount Zone",
  "Inducement",
  "Kill Zone Entry",
  "NWOG",
  "NDOG",
  "Session Open",
  "News Catalyst",
] as const;

export const ICT_MISTAKE_TAGS = [
  "Chased Price",
  "Early Entry",
  "Late Entry",
  "Oversized",
  "Early Exit",
  "Held Too Long",
  "Moved Stop",
  "Widened SL",
  "FOMO",
  "Revenge Trade",
  "No Clear Setup",
  "Broke Rules",
  "Overtraded",
  "Wrong Session",
  "Against HTF Bias",
  "Ignored News",
  "No Confirmation",
  "Hesitation",
] as const;

export type SetupTag = (typeof ICT_SETUP_TAGS)[number];
export type MistakeTag = (typeof ICT_MISTAKE_TAGS)[number];
