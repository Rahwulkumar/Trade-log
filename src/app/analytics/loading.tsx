import {
  LoadingHeroPanel,
  LoadingMetricGrid,
  LoadingPanel,
} from "@/components/ui/loading";

export default function AnalyticsLoading() {
  return (
    <div className="page-root page-sections">
      <LoadingHeroPanel />
      <LoadingMetricGrid />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <LoadingPanel className="lg:col-span-1" rows={3} />
        <LoadingPanel className="lg:col-span-2" chart />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingPanel key={index} chart />
        ))}
      </div>
    </div>
  );
}
