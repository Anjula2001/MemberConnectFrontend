export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clean layout — no sidebar, no header
  return <>{children}</>;
}
