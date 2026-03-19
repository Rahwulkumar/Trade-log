import { AppPanel } from '@/components/ui/page-primitives';

export default function AnalyticsLoading() {
  return (
    <div className="page-root page-sections">
      <AppPanel className="p-6">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="mt-3 skeleton h-8 w-56 rounded" />
        <div className="mt-3 skeleton h-3 w-80 rounded" />
      </AppPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppPanel className="p-5">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="mt-4 skeleton h-24 w-full rounded-2xl" />
        </AppPanel>
        <AppPanel className="p-5 lg:col-span-2">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="mt-4 skeleton h-[260px] w-full rounded-2xl" />
        </AppPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <AppPanel key={index} className="p-5">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="mt-4 skeleton h-[220px] w-full rounded-2xl" />
          </AppPanel>
        ))}
      </div>
    </div>
  );
}
