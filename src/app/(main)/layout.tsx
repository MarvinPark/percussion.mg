import AppHeader from "@/components/app-header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      {children}
    </div>
  );
}
