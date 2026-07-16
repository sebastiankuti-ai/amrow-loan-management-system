import React, { useState, useRef, useEffect } from "react";
import { useApp } from "./AppContext.js";
import { UserRole } from "../types.js";
import { 
  Bell, RefreshCw, AlertTriangle, ShieldCheck, MapPin, 
  ChevronLeft, ChevronRight, Home, Search, X, 
  User, FileText, CreditCard, Layers, LogOut, CheckCircle2, History, Settings
} from "lucide-react";

interface HeaderProps {
  onRoleSwitch: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({ onRoleSwitch }) => {
  const { 
    currentUser, 
    currentBranch, 
    triggerPenaltyChecks, 
    state,
    currentView,
    viewHistory,
    historyIndex,
    navigateTo,
    navigateBack,
    navigateForward
  } = useApp();

  const [checking, setChecking] = useState(false);
  const [checkedCount, setCheckedCount] = useState<number | null>(null);

  // UI Dropdowns
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outer click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRunPenaltyProcess = async () => {
    setChecking(true);
    setCheckedCount(null);
    try {
      const count = await triggerPenaltyChecks();
      setCheckedCount(count);
      setTimeout(() => {
        setCheckedCount(null);
      }, 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  // Find loans due past 3 days to show alert count
  const today = new Date("2026-07-15T11:42:00Z");
  const overdueUnpenalizedLoans = state.loans.filter(loan => {
    if (loan.status === "Disbursed" && !loan.penaltyAppliedDate) {
      const dueDate = new Date(loan.dueDate || "");
      const diffDays = (today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24);
      return diffDays > 3;
    }
    return false;
  });

  // Universal Search filtering
  const getSearchResults = () => {
    if (!searchQuery.trim()) return { clients: [], loans: [], staff: [], transactions: [] };
    const query = searchQuery.toLowerCase().trim();

    const filteredClients = state.clients.filter(c => 
      c.fullName.toLowerCase().includes(query) ||
      c.idNumber.includes(query) ||
      c.phoneNumber.includes(query) ||
      c.businessName.toLowerCase().includes(query)
    ).slice(0, 4);

    const filteredLoans = state.loans.filter(l => 
      l.loanNumber.toLowerCase().includes(query) ||
      l.id.toLowerCase().includes(query)
    ).slice(0, 4);

    const filteredStaff = state.staff.filter(s => 
      s.fullName.toLowerCase().includes(query) ||
      s.username.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.role.toLowerCase().includes(query)
    ).slice(0, 4);

    const filteredTransactions = state.transactions.filter(t => 
      t.id.toLowerCase().includes(query) ||
      (t.notes && t.notes.toLowerCase().includes(query)) ||
      t.type.toLowerCase().includes(query)
    ).slice(0, 4);

    return {
      clients: filteredClients,
      loans: filteredLoans,
      staff: filteredStaff,
      transactions: filteredTransactions
    };
  };

  const { clients: sClients, loans: sLoans, staff: sStaff, transactions: sTxs } = getSearchResults();
  const hasSearchResults = sClients.length > 0 || sLoans.length > 0 || sStaff.length > 0 || sTxs.length > 0;

  // Generate breadcrumb text
  const renderBreadcrumbs = () => {
    const crumbs = [{ label: "Home", onClick: () => navigateTo("dashboard", undefined, undefined, "Home") }];

    if (currentView.tab !== "dashboard") {
      // Determine secondary path
      if (currentView.tab === "clients") {
        crumbs.push({ label: "Clients", onClick: () => navigateTo("clients") });
        if (currentView.entityId) {
          const client = state.clients.find(c => c.id === currentView.entityId);
          if (client) {
            crumbs.push({ 
              label: client.fullName, 
              onClick: () => navigateTo("clients", "Client", client.id, client.fullName) 
            });
          }
        }
      } else if (currentView.tab === "loans") {
        crumbs.push({ label: "Loans", onClick: () => navigateTo("loans") });
        if (currentView.entityId) {
          const loan = state.loans.find(l => l.id === currentView.entityId);
          if (loan) {
            const client = state.clients.find(c => c.id === loan.clientId);
            if (client) {
              crumbs.push({ 
                label: client.fullName, 
                onClick: () => navigateTo("clients", "Client", client.id, client.fullName) 
              });
            }
            crumbs.push({ 
              label: `Ref: ${loan.loanNumber}`, 
              onClick: () => navigateTo("loans", "Loan", loan.id, `Loan ${loan.loanNumber}`) 
            });
          }
        }
      } else if (currentView.tab === "staff") {
        crumbs.push({ label: "Staff", onClick: () => navigateTo("staff") });
        if (currentView.entityId) {
          const s = state.staff.find(m => m.id === currentView.entityId);
          if (s) {
            crumbs.push({ 
              label: s.fullName, 
              onClick: () => navigateTo("staff", "Staff", s.id, s.fullName) 
            });
          }
        }
      } else {
        crumbs.push({ 
          label: currentView.title || currentView.tab.charAt(0).toUpperCase() + currentView.tab.slice(1), 
          onClick: () => navigateTo(currentView.tab) 
        });
      }
    }

    return (
      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 font-sans">
        {crumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-slate-300">/</span>}
            <button
              onClick={crumb.onClick}
              className={`hover:text-blue-600 transition-colors ${
                idx === crumbs.length - 1 ? "text-slate-900 font-bold" : ""
              }`}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <header id="app-header" className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between shadow-xs shrink-0 select-none relative z-40">
      
      {/* 1. Navigation Controls & Breadcrumbs */}
      <div className="flex items-center space-x-4">
        {/* Browser history smart buttons */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
          <button
            id="btn-nav-back"
            onClick={navigateBack}
            disabled={historyIndex === 0}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Go Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            id="btn-nav-forward"
            onClick={navigateForward}
            disabled={historyIndex >= viewHistory.length - 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Go Forward"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            id="btn-nav-home"
            onClick={() => navigateTo("dashboard", undefined, undefined, "Home")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-white transition-all"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Breadcrumbs */}
        <div className="hidden lg:block border-l border-slate-200 pl-4 py-1.5">
          {renderBreadcrumbs()}
        </div>
      </div>

      {/* 2. Universal Search Box */}
      <div ref={searchRef} className="flex-1 max-w-md mx-6 relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="universal-quick-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="Universal Search (Name, National ID, Ref#, Receipt...)"
            className="w-full pl-10 pr-8 py-2 bg-slate-100 focus:bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all font-sans"
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setShowSearch(false); }}
              className="absolute right-2.5 top-2.5 p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Floating Search Results */}
        {showSearch && searchQuery.trim() && (
          <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 max-h-[420px] overflow-y-auto z-50 text-left space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results</span>
              <span className="text-[10px] text-slate-400 font-mono">Found {sClients.length + sLoans.length + sStaff.length + sTxs.length} items</span>
            </div>

            {!hasSearchResults ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No matching Kakamega records found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Clients Category */}
                {sClients.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      <User className="h-3 w-3 text-blue-500" />
                      <span>Clients</span>
                    </div>
                    <div className="space-y-1">
                      {sClients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            navigateTo("clients", "Client", c.id, c.fullName);
                            setShowSearch(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex justify-between items-center transition"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{c.fullName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {c.idNumber} • Biz: {c.businessName}</p>
                          </div>
                          <span className="text-[9px] bg-blue-50 text-blue-600 font-mono px-1.5 py-0.5 rounded font-bold uppercase">View Profile</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loans Category */}
                {sLoans.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      <CreditCard className="h-3 w-3 text-emerald-500" />
                      <span>Loans</span>
                    </div>
                    <div className="space-y-1">
                      {sLoans.map(l => {
                        const owner = state.clients.find(c => c.id === l.clientId);
                        return (
                          <button
                            key={l.id}
                            onClick={() => {
                              navigateTo("loans", "Loan", l.id, `Loan ${l.loanNumber}`);
                              setShowSearch(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex justify-between items-center transition"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">Ref: {l.loanNumber}</p>
                              <p className="text-[10px] text-slate-500 font-sans">Owner: {owner?.fullName || "Unknown"} • KES {l.amountRequested.toLocaleString()}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              l.status === "In Arrears" || l.status === "Defaulted"
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}>{l.status}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Staff Category */}
                {sStaff.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      <Layers className="h-3 w-3 text-violet-500" />
                      <span>Staff Directory</span>
                    </div>
                    <div className="space-y-1">
                      {sStaff.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            navigateTo("staff", "Staff", s.id, s.fullName);
                            setShowSearch(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex justify-between items-center transition"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{s.fullName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Role: {s.role} • @{s.username}</p>
                          </div>
                          <span className="text-[9px] bg-violet-50 text-violet-600 font-mono px-1.5 py-0.5 rounded font-bold uppercase">View Profile</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transactions Category */}
                {sTxs.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      <FileText className="h-3 w-3 text-amber-500" />
                      <span>Transactions & Receipts</span>
                    </div>
                    <div className="space-y-1">
                      {sTxs.map(t => {
                        const client = state.clients.find(c => c.id === t.clientId);
                        return (
                          <div
                            key={t.id}
                            className="p-2 bg-slate-50/50 rounded-lg flex justify-between items-center text-xs"
                          >
                            <div>
                              <p className="font-mono font-bold text-slate-800">{t.id.toUpperCase()}</p>
                              <p className="text-[10px] text-slate-500">{t.type} • client: {client?.fullName || "N/A"}</p>
                            </div>
                            <span className="font-mono font-extrabold text-slate-900">KES {t.amount.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Right side Actions Tray */}
      <div className="flex items-center space-x-4">
        
        {/* Scope Area Indicator */}
        <div className="hidden md:flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-100">
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          <span>Kakamega Ops Only</span>
        </div>

        {/* Quick Role Switcher for Evaluation - MD ONLY */}
        {currentUser?.role === UserRole.MD && (
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase pl-1.5 select-none">Role:</span>
            <select
              id="demo-role-switcher"
              value={currentUser?.role || ""}
              onChange={(e) => onRoleSwitch(e.target.value as UserRole)}
              className="text-xs bg-white text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 font-semibold focus:outline-hidden cursor-pointer"
            >
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        )}

        {/* Penalty Process Button - MD, Finance, or Accountant ONLY */}
        {(currentUser?.role === UserRole.MD || 
          currentUser?.role === UserRole.FINANCE || 
          currentUser?.role === UserRole.ACCOUNTANT) && (
          <div className="relative">
            <button
              id="btn-run-penalty"
              onClick={handleRunPenaltyProcess}
              disabled={checking}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                overdueUnpenalizedLoans.length > 0 
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title="Apply 12% overdue penalty for loans due more than 3 days ago"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{checking ? "Processing..." : "Run Penalty Check"}</span>
              {overdueUnpenalizedLoans.length > 0 && (
                <span className="bg-amber-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                  {overdueUnpenalizedLoans.length}
                </span>
              )}
            </button>

            {/* Toast response message inside header */}
            {checkedCount !== null && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl border border-slate-800 z-50 flex items-start space-x-2 animate-bounce">
                {checkedCount > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Overdue Rules Triggered!</p>
                      <p className="text-slate-300">Successfully applied a 12% penalty to {checkedCount} overdue loans.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Portfolio Safe</p>
                      <p className="text-slate-300">No overdue loans (&gt;3 days past due) require penalty.</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button 
            id="btn-notification-bell" 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-all relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 bg-blue-600 w-2 h-2 rounded-full animate-ping"></span>
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
              <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                <span className="text-xs font-bold tracking-wider uppercase">Repayment & SMS Reminders</span>
                <span className="bg-blue-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">LMS LIVE</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 text-left">
                {state.smsNotifications && state.smsNotifications.length > 0 ? (
                  state.smsNotifications.slice(0, 6).map(sms => (
                    <div key={sms.id} className="p-3 hover:bg-slate-50 transition-all text-xs">
                      <div className="flex justify-between font-bold text-slate-800 mb-0.5">
                        <span>To: {sms.clientName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{new Date(sms.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-500 leading-relaxed font-mono text-[10px] break-words">{sms.message}</p>
                      <div className="mt-1 flex items-center space-x-1 text-[9px] text-emerald-600 font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Dispatched successfully</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No dispatched SMS reminders in active cache.
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
                <button 
                  onClick={() => { navigateTo("audit-logs"); setShowNotifications(false); }}
                  className="text-[10px] text-blue-600 font-extrabold hover:underline"
                >
                  View Complete System Logs ➔
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Console */}
        <div ref={profileRef} className="relative border-l border-slate-200 pl-4">
          <button 
            id="btn-profile-console"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2.5 focus:outline-hidden group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm hover:scale-105 transition-all">
              {currentUser?.fullName.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors leading-tight">{currentUser?.fullName}</p>
              <p className="text-[10px] text-slate-400 leading-none">{currentUser?.role}</p>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 text-left animate-fadeIn">
              <div className="p-4 bg-slate-900 text-white space-y-1.5">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">SESSION CLEARANCE: SECURE</span>
                  <span className="text-[9px] text-slate-400 font-mono">Kakamega Branch</span>
                </div>
                <h4 className="font-bold text-sm">{currentUser?.fullName}</h4>
                <p className="text-xs text-slate-300">{currentUser?.email}</p>
                <div className="text-[10px] text-slate-400 pt-1 flex items-center space-x-1 font-semibold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                  <span>Compliance Framework: Dual-Control V2</span>
                </div>
              </div>

              <div className="p-2 space-y-1">
                <button
                  onClick={() => { navigateTo("dashboard"); setShowProfileMenu(false); }}
                  className="w-full flex items-center space-x-2.5 p-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                >
                  <Home className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">Operations Dashboard</span>
                </button>

                <button
                  onClick={() => { navigateTo("settings"); setShowProfileMenu(false); }}
                  className="w-full flex items-center space-x-2.5 p-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">System Settings</span>
                </button>

                <button
                  onClick={() => { navigateTo("audit-logs"); setShowProfileMenu(false); }}
                  className="w-full flex items-center space-x-2.5 p-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                >
                  <History className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">Your System Audit Logs</span>
                </button>
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-[9px] font-mono text-slate-400">AMROW LMS v4.2</span>
                <button
                  onClick={() => {
                    // Triggers the standard logout button in App content
                    const logOutBtn = document.getElementById("btn-sidebar-logout");
                    if (logOutBtn) {
                      logOutBtn.click();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 text-[10px] font-bold rounded-lg flex items-center space-x-1 transition"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
