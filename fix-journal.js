const fs = require('fs');
const f = 'f:/TradingJournal/trading-journal/src/components/journal/journal-library.tsx';
let content = fs.readFileSync(f, 'utf8');

// 1. Replace the colour constants block
const colourBlock = /\/\/ [^\n]*Colour helpers[^\n]*\nconst ACCENT = [^\n]*\nconst PROFIT = [^\n]*\nconst LOSS = [^\n]*\n/;
const sharedImports = `// -- Shared format helpers (Phase 3: deduplicated) --
import {
  fmtCurrency,
  fmtR,
  fmtDate,
  fmtDateShort,
  getOutcome,
  PROFIT,
  LOSS_COLOR as LOSS,
  ACCENT,
} from "@/components/journal/utils/format";

// -- isJournaled now uses the domain mapper --
import { isRawTradeJournaled as isJournaled } from "@/domain/journal-mapper";

`;
content = content.replace(colourBlock, sharedImports);

// 2. Remove the getOutcome function
content = content.replace(
  /function getOutcome\(t: JournalTrade\) \{[\s\S]*?return "BE";\n\}\n\n/,
  ''
);

// 3. Remove fmtCurrency function
content = content.replace(
  /function fmtCurrency\(n: number \| null \| undefined\) \{[\s\S]*?\}\n/,
  ''
);

// 4. Remove fmtR function
content = content.replace(
  /function fmtR\(n: number \| null \| undefined\) \{[\s\S]*?\}\n/,
  ''
);

// 5. Remove fmtDate function
content = content.replace(
  /function fmtDate\(d: string \| null \| undefined\) \{[\s\S]*?\}\n/,
  ''
);

// 6. Remove fmtDateShort function
content = content.replace(
  /function fmtDateShort\(d: string \| null \| undefined\) \{[\s\S]*?\}\n/,
  ''
);

// 7. Remove JournaledFields type and isJournaled function
content = content.replace(
  /\/\/ [^\n]*Type used internally[^\n]*\ntype JournaledFields[\s\S]*?export function isJournaled[\s\S]*?\n\}\n/,
  ''
);

fs.writeFileSync(f, content, 'utf8');
const lines = content.split(/\r?\n/).length;
console.log('Done. New total lines:', lines);
