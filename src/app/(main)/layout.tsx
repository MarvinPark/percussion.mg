import AppHeader from "@/components/app-header";
import BodyRouteReset from "@/components/body-route-reset";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-background">
      <BodyRouteReset />
      <AppHeader />
      {children}
    </div>
  );
}
