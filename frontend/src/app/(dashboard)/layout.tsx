import AppLayout from "@/app/_layout/AppLayout";
import { DashboardProviders } from "@/app/_providers/DashboardProviders";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DashboardProviders />
      <AppLayout>{children}</AppLayout>
    </>
  );
}
