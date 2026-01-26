export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fade-in h-[calc(100vh-80px)] overflow-hidden">
      {children}
    </div>
  );
}
