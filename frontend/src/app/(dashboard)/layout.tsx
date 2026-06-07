import AppLayout from "@/app/_layout/AppLayout";

export default function DashboardLayout({
                                          children,
                                        }: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppLayout>{ children }</AppLayout>;
}
