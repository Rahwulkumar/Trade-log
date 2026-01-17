export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto fade-in">
      {children}
    </div>
  );
}
