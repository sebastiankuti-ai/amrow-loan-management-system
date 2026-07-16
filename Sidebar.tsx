import React from "react";
import { UserRole } from "../types.js";
import { useApp } from "./AppContext.js";
import { AmrowLogoDark } from "./AmrowLogo.js";
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  Settings, 
  ShieldAlert, 
  LogOut, 
  Building2, 
  Activity, 
  MessageSquareCode
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const { currentUser, currentBranch } = useApp();

  if (!currentUser) return null;

  const role = currentUser.role;

  // Define sidebar links based on role
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: [UserRole.MD, UserRole.FINANCE, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT, UserRole.LOAN_OFFICER, UserRole.SUPERVISOR, UserRole.IT, UserRole.HR]
    },
    {
      id: "clients",
      label: "Clients Directory",
      icon: Users,
      roles: [UserRole.MD, UserRole.FINANCE, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT, UserRole.LOAN_OFFICER, UserRole.SUPERVISOR]
    },
    {
      id: "loans",
      label: "Loan Management",
      icon: FileSpreadsheet,
      roles: [UserRole.MD, UserRole.FINANCE, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT, UserRole.LOAN_OFFICER, UserRole.SUPERVISOR]
    },
    {
      id: "staff",
      label: "Staff Directory",
      icon: Building2,
      roles: [UserRole.MD, UserRole.BRANCH_MANAGER, UserRole.HR] // BM can view their staff, MD & HR can manage/verify
    },
    {
      id: "settings",
      label: "Products & Rules",
      icon: Settings,
      roles: [UserRole.MD, UserRole.IT] // MD and IT can access settings
    },
    {
      id: "audit-logs",
      label: "Compliance & SMS Logs",
      icon: ShieldAlert,
      roles: [UserRole.MD, UserRole.BRANCH_MANAGER, UserRole.FINANCE, UserRole.IT, UserRole.HR]
    }
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div id="app-sidebar" className="w-64 bg-slate-900 text-white flex flex-col h-screen border-r border-slate-800 shadow-xl shrink-0">
      {/* Branding Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950 flex flex-col items-start">
        <div className="w-full px-1">
          <AmrowLogoDark className="h-10 text-left" />
        </div>
        <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest font-mono pl-1">Kakamega County, KE</p>
      </div>

      {/* User Info Capsule */}
      <div className="p-4 mx-3 my-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <p className="text-xs text-slate-400 font-medium">Log-in Session</p>
        <p className="text-sm font-semibold truncate text-white">{currentUser.fullName}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded font-mono uppercase">
            {currentUser.role.split(" ")[0]}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={currentBranch?.name || "Main Branch"}>
            📍 {currentBranch?.name.split(" ")[0] || "Kakamega"}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`nav-tab-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Footer & Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          id="btn-logout"
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit LMS</span>
        </button>
        <div className="mt-3 text-center text-[10px] text-slate-500 font-mono">
          AMROW LMS v2.4 • Kakamega
        </div>
      </div>
    </div>
  );
};
