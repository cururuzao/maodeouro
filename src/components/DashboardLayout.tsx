import AppSidebar from "./AppSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
