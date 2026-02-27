export default function NotebookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fade-in">{children}</div>;
}
