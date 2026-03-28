import { Suspense } from "react";
import { LoadingJournalWorkspace } from "@/components/ui/loading";
import JournalClient from "./journal-client";

function JournalLoadingState() {
  return <LoadingJournalWorkspace />;
}

export default function JournalPage() {
  return (
    <Suspense fallback={<JournalLoadingState />}>
      <JournalClient />
    </Suspense>
  );
}
