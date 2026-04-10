export interface JournalBrief {
  trigger: string;
  management: string;
  exit: string;
}

export type JournalBriefField = keyof JournalBrief;

const SECTION_MAP: Array<{
  label: "Entry" | "Adds" | "Exit";
  field: JournalBriefField;
}> = [
  { label: "Entry", field: "trigger" },
  { label: "Adds", field: "management" },
  { label: "Exit", field: "exit" },
];

function emptyBrief(): JournalBrief {
  return {
    trigger: "",
    management: "",
    exit: "",
  };
}

export function parseJournalBrief(value: string): JournalBrief {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return emptyBrief();
  }

  const matches = [
    ...normalized.matchAll(
      /(^|\n)(Entry|Trigger|Adds|Management|Exit):\s*/g,
    ),
  ];

  if (matches.length === 0 || matches[0].index !== 0) {
    return {
      ...emptyBrief(),
      trigger: normalized,
    };
  }

  const brief = emptyBrief();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const label = match[2];
    const section =
      label === "Trigger"
        ? SECTION_MAP.find((item) => item.field === "trigger")
        : label === "Management"
          ? SECTION_MAP.find((item) => item.field === "management")
          : SECTION_MAP.find((item) => item.label === label);

    if (!section) {
      continue;
    }

    const start = match.index + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? normalized.length)
        : normalized.length;

    brief[section.field] = normalized.slice(start, end).trim();
  }

  return brief;
}

export function serializeJournalBrief(brief: JournalBrief): string {
  return SECTION_MAP
    .map(({ label, field }) => {
      const value = brief[field].trim();
      if (!value) {
        return null;
      }

      return `${label}: ${value}`;
    })
    .filter((section): section is string => Boolean(section))
    .join("\n");
}
