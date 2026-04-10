import {
  parseJournalBrief,
  serializeJournalBrief,
} from "@/domain/journal-brief";

describe("journal-brief", () => {
  it("parses structured trade brief text into narrative fields", () => {
    expect(
      parseJournalBrief(
        [
          "Entry: Sweep into prior low and reclaim.",
          "Adds: Held through first pullback then trimmed early.",
          "Exit: Closed when structure broke.",
        ].join("\n"),
      ),
    ).toEqual({
      trigger: "Sweep into prior low and reclaim.",
      management: "Held through first pullback then trimmed early.",
      exit: "Closed when structure broke.",
    });
  });

  it("treats legacy freeform notes as the first prompt", () => {
    expect(parseJournalBrief("Clean reclaim long, but I trimmed too soon.")).toEqual(
      {
        trigger: "Clean reclaim long, but I trimmed too soon.",
        management: "",
        exit: "",
      },
    );
  });

  it("serializes only the fields that were filled", () => {
    expect(
      serializeJournalBrief({
        trigger: "Sweep and reclaim.",
        management: "",
        exit: "Closed on structure break.",
      }),
    ).toBe("Entry: Sweep and reclaim.\nExit: Closed on structure break.");
  });
});
