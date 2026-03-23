import { Suspense } from "react";
import JournalClient from "./journal-client";

function JournalLoadingState() {
  return (
    <div
      className="flex h-[calc(100dvh-64px)] items-center px-6"
      style={{ background: "var(--app-bg)" }}
    >
      <p
        style={{
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-inter)",
          fontSize: "13px",
        }}
      >
        Loading trade journal...
      </p>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<JournalLoadingState />}>
      <JournalClient />
    </Suspense>
  );
}
