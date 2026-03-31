import { LoadingCalendarGrid, LoadingMetricGrid, LoadingPanel } from "@/components/ui/loading";

export default function CalendarLoading() {
  return (
    <div className="page-root page-sections">
      <LoadingPanel rows={2} title="Loading calendar review" />
      <LoadingMetricGrid />
      <LoadingCalendarGrid />
      <LoadingPanel rows={5} title="Loading day review" />
    </div>
  );
}
