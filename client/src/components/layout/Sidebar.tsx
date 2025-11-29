import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, BarChart, DollarSign, FileText, Settings, Menu, Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TenantSwitcher } from "./TenantSwitcher";

export default function Sidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Query user data
  const { data: user } = useQuery<{
    id: number;
    username: string;
    displayName: string;
    email: string;
    role: string;
    avatar: string | null;
  }>({
    queryKey: ["/api/session"],
  });

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      {/* Mobile menu button - shows outside the sidebar */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="p-2 rounded-md text-foreground bg-card border border-border shadow-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed md:relative z-40 md:flex md:flex-col md:flex-shrink-0 transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col w-64 h-full border-r border-border bg-card">
          <div className="flex items-center h-16 px-4 border-b border-border">
            <div className="h-10 w-10 rounded-lg bg-orange-500 dark:bg-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div className="ml-2">
              <h2 className="text-lg font-bold gradient-text">Claudefo</h2>
              <p className="text-xs text-muted-foreground">AI-Powered Financial Operations</p>
            </div>
          </div>
          
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-1">
              {/* Navigation Items */}
              <NavItem href="/" icon={<Home />} active={location === "/"}>
                Dashboard
              </NavItem>
              
              <NavItem href="/reports" icon={<BarChart />} active={location === "/reports"}>
                Financial Reports
              </NavItem>
              
              <NavItem href="/cash-flow" icon={<DollarSign />} active={location === "/cash-flow"}>
                Cash Flow
              </NavItem>
              
              <NavItem href="/invoices" icon={<FileText />} active={location === "/invoices"}>
                Invoices
              </NavItem>
              <NavItem href="/connections" icon={<Plug />} active={location === "/connections"}>
                Connections
              </NavItem>
              
              <NavItem href="/settings" icon={<Settings />} active={location === "/settings"}>
                Settings
              </NavItem>
            </nav>
          </div>

          {/* Tenant Switcher (system mode only) */}
          {import.meta.env.MODE === 'system' && (
            <div className="px-4 pb-4">
              <TenantSwitcher />
            </div>
          )}

          {user && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img 
                    className="w-10 h-10 rounded-full border-2 border-orange-500 dark:border-orange-400" 
                    src={user.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} 
                    alt="User avatar"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-foreground">
                    {user.displayName}
                  </p>
                  <p className="text-xs claudefo-orange">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  active: boolean;
  children: React.ReactNode;
};

function NavItem({ href, icon, active, children }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center px-4 py-2 text-sm font-medium rounded-md group transition-all duration-200 cursor-pointer",
          active
            ? "text-white bg-orange-500 dark:bg-orange-600 shadow-md shadow-orange-500/20"
            : "text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
        )}
      >
        <span className={cn("w-5 h-5 mr-3", active ? "text-white" : "text-muted-foreground group-hover:text-orange-500 dark:group-hover:text-orange-400")}>
          {icon}
        </span>
        {children}
      </div>
    </Link>
  );
}
