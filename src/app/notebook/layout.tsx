export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fade-in h-[calc(100vh-4rem)] overflow-hidden">
      {children}
    </div>
  );
}
