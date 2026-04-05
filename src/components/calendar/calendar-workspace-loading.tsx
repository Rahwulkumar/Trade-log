"use client";

import { LoadingBlock } from "@/components/ui/loading";
import { AppPanel } from "@/components/ui/page-primitives";

export function CalendarWorkspaceLoading({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const content = (
    <>
      <section aria-hidden="true" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <LoadingBlock className="h-3 w-16 rounded-full" />
          <LoadingBlock className="h-7 w-36 rounded-full" />
        </div>
        <LoadingBlock className="h-8 w-40 rounded-full" />
        <div className="flex flex-wrap gap-3">
          <LoadingBlock className="h-3.5 w-16 rounded-full" />
          <LoadingBlock className="h-3.5 w-20 rounded-full" />
          <LoadingBlock className="h-3.5 w-20 rounded-full" />
        </div>
      </section>

      <div className="grid w-full gap-3 xl:min-h-[42rem] xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)] xl:items-stretch 2xl:min-h-[46rem] 2xl:grid-cols-[minmax(0,1.72fr)_minmax(24rem,1fr)] 2xl:gap-4">
        <AppPanel className="min-h-[24rem] min-w-0 overflow-hidden p-1.5 sm:p-2 xl:h-full xl:min-h-[42rem] 2xl:min-h-[46rem]">
          <div className="min-w-[26rem] sm:min-w-[34rem] md:min-w-0 md:w-full">
            <LoadingBlock className="h-[22rem] w-full rounded-[var(--radius-lg)] xl:h-[40rem] 2xl:h-[44rem]" />
          </div>
        </AppPanel>
        <AppPanel className="min-h-[14rem] p-3 sm:p-3.5 xl:h-full xl:min-h-[42rem] 2xl:min-h-[46rem]">
          <div className="space-y-2">
            <LoadingBlock className="h-3 w-16 rounded-full" />
            <LoadingBlock className="h-6 w-40 rounded-full" />
            <div className="flex gap-2">
              <LoadingBlock className="h-7 w-20 rounded-full" />
              <LoadingBlock className="h-7 w-20 rounded-full" />
              <LoadingBlock className="h-7 w-20 rounded-full" />
            </div>
            <div className="space-y-1.5 pt-2">
              <LoadingBlock className="h-16 w-full rounded-[12px]" />
              <LoadingBlock className="h-16 w-full rounded-[12px]" />
              <LoadingBlock className="h-16 w-full rounded-[12px]" />
            </div>
          </div>
        </AppPanel>
      </div>
    </>
  );

  if (!standalone) {
    return content;
  }

  return (
    <div className="page-root">
      <div className="page-sections w-full">{content}</div>
    </div>
  );
}
