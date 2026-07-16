import React from "react";
import { useApp } from "./AppContext.js";
import { UserRole } from "../types.js";
import { 
  Briefcase, 
  Coins, 
  Clock, 
  AlertTriangle, 
  Users, 
  CheckCircle, 
  ArrowUpRight 
} from "lucide-react";

export const ManagerDashboard: React.FC = () => {
  const { state, currentUser, currentBranch, updateState, logAction, systemDate } = useApp();
  const { staff, clients, loans, transactions } = state;

  if (!currentUser) return null;

  const branchId = currentUser.branchId;

  // Filter to Branch State
  const branchStaff = staff.filter(s => s.branchId === branchId);
  const branchStaffIds = branchStaff.map(s => s.id);
  
  const branchClients = clients.filter(c => c.branchId === branchId);
  const branchClientIds = branchClients.map(c => c.id);

  const branchLoans = loans.filter(l => branchClientIds.includes(l.clientId));
  const activeBranchLoans = branchLoans.filter(l => l.status === "Disbursed" || l.status === "Fully Repaid");

  // Daily collections (July 15, 2026 repayments)
  const todayDateStr = systemDate.substring(0, 10);
  const branchRepayments = transactions.filter(t => 
    t.type === "Repayment" && 
    branchClientIds.includes(t.clientId)
  );
  
  const dailyRepayments = branchRepayments.filter(t => t.date.startsWith(todayDateStr));
  const dailyCollectionsSum = dailyRepayments.reduce((sum, t) => sum + t.amount, 0);
  const totalCollectionsSum = branchRepayments.reduce((sum, t) => sum + t.amount, 0);

  // Portfolio
  const branchOutstandingSum = branchLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const totalIssuedSum = activeBranchLoans.reduce((sum, l) => sum + l.amountRequested, 0);

  // Status breakdown
  const pendingLoans = branchLoans.filter(l => l.status === "Pending");
  const approvedLoans = branchLoans.filter(l => l.status === "Approved");
  const overdueLoans = branchLoans.filter(l => {
    if (l.status !== "Disbursed" && l.status !== "In Arrears" && l.status !== "Defaulted") return false;
    if (!l.dueDate) return false;
    const today = new Date(systemDate);
    const dueDate = new Date(l.dueDate);
    return dueDate < today;
  });
  const defaultsSum = overdueLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  // Loan Officers performance under this branch
  const plos = branchStaff.filter(s => s.role === UserRole.LOAN_OFFICER);
  const ploPerformance = plos.map(plo => {
    const ploClients = branchClients.filter(c => c.assignedOfficerId === plo.id);
    const ploClientsIds = ploClients.map(c => c.id);
    const ploLoans = branchLoans.filter(l => ploClientsIds.includes(l.clientId));
    const ploOutstanding = ploLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
    const ploCollections = transactions
      .filter(t => t.type === "Repayment" && ploClientsIds.includes(t.clientId))
      .reduce((sum, t) => sum + t.amount, 0);

    const ploDormantCount = ploClients.filter(c => {
      const hasActiveLoan = loans.some(l => l.clientId === c.id && (l.status === "Disbursed" || l.status === "In Arrears" || l.status === "Defaulted"));
      return !hasActiveLoan;
    }).length;

    const ploActiveCount = ploClients.length - ploDormantCount;
    const ploRetention = ploClients.length > 0 ? (ploActiveCount / ploClients.length) * 100 : 0;

    const ploRegThisMonth = ploClients.filter(c => c.registeredAt.startsWith("2026-07")).length;
    const ploOnboardingTarget = 5; // monthly target per PLO
    const ploOnboarding = (ploRegThisMonth / ploOnboardingTarget) * 100;

    const todayObj = new Date(systemDate);
    const ploOverdue = ploLoans.filter(l => {
      if (l.status !== "Disbursed" && l.status !== "In Arrears" && l.status !== "Defaulted") return false;
      return new Date(l.dueDate) < todayObj;
    });
    const ploArrears = ploOverdue.reduce((sum, l) => sum + l.outstandingBalance, 0);
    const ploCollectionRate = (ploCollections + ploArrears) > 0 ? (ploCollections / (ploCollections + ploArrears)) * 100 : 100;

    return {
      ...plo,
      outstanding: ploOutstanding,
      collections: ploCollections,
      clientCount: ploClients.length,
      dormantCount: ploDormantCount,
      retention: ploRetention,
      onboarding: ploOnboarding,
      collectionRate: ploCollectionRate
    };
  }).sort((a, b) => b.collections - a.collections);

  // Branch Performance Calculations
  const dormantClients = branchClients.filter(c => {
    const hasActiveLoan = loans.some(l => l.clientId === c.id && (l.status === "Disbursed" || l.status === "In Arrears" || l.status === "Defaulted"));
    return !hasActiveLoan;
  });
  const dormantCount = dormantClients.length;

  const branchActiveCount = branchClients.length - dormantCount;
  const branchRetentionRate = branchClients.length > 0 ? (branchActiveCount / branchClients.length) * 100 : 0;

  const branchRegThisMonth = branchClients.filter(c => c.registeredAt.startsWith("2026-07")).length;
  const branchOnboardingTarget = 10;
  const branchOnboardingRate = (branchRegThisMonth / branchOnboardingTarget) * 100;

  const branchCollectionRate = (totalCollectionsSum + defaultsSum) > 0 ? (totalCollectionsSum / (totalCollectionsSum + defaultsSum)) * 100 : 100;

  const handleWakeUpClient = async (client: any) => {
    const newMessage = `Dear ${client.fullName}, we miss you at AMROW CAPITAL LTD! We have exciting new short-term credit facilities available for your business "${client.businessName}". Visit our branch or contact your assigned PLO for friendly loan top-ups.`;
    const newSms = {
      id: `sms-${Date.now()}`,
      clientId: client.id,
      clientName: client.fullName,
      phoneNumber: client.phoneNumber,
      loanRef: "N/A",
      message: newMessage,
      type: "Marketing",
      sentAt: new Date().toISOString()
    };
    const newState = {
      ...state,
      smsNotifications: [...state.smsNotifications, newSms]
    };
    await updateState(newState);
    await logAction("Dormant Re-engagement", `Dispatched promotional engagement SMS to dormant client "${client.fullName}"`);
    alert(`Engagement SMS successfully dispatched to ${client.fullName} (${client.phoneNumber})`);
  };

  const getRangeBadge = (val: number) => {
    if (val >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (val >= 75) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100 animate-pulse";
  };

  return (
    <div className="space-y-6">
      {/* Upper Manager Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 rounded-xl shadow-md border border-blue-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold uppercase px-2.5 py-1 rounded font-mono">Branch Management Portal</span>
          <h1 className="text-xl font-bold mt-1.5">{currentBranch?.name || "Branch Office"} • Kakamega</h1>
          <p className="text-xs text-slate-300">Overseeing local portfolio quality, collections performance, and field operations.</p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 text-right">
          <p className="text-[10px] text-slate-300 uppercase font-mono">System Clock Indicator</p>
          <p className="text-sm font-mono font-bold">2026-07-15 11:42</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Branch Portfolio</p>
            <p className="text-lg font-bold text-slate-900">KES {branchOutstandingSum.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active Outstanding Book</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Daily Collections</p>
            <p className="text-lg font-bold text-emerald-600">KES {dailyCollectionsSum.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recorded Today</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Decisions</p>
            <p className="text-lg font-bold text-amber-600">{pendingLoans.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{approvedLoans.length} approved, awaiting release</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Arrears/Defaults</p>
            <p className="text-lg font-bold text-rose-600">KES {defaultsSum.toLocaleString()}</p>
            <p className="text-[11px] text-rose-500 font-medium mt-0.5">{overdueLoans.length} Overdue accounts</p>
          </div>
        </div>

      </div>

      {/* Target Performance Range Tracking Hub */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">Amrow Branch Target Performance Hub</h3>
            <p className="text-[10px] text-slate-500">Real-time target pacing against operational expectations</p>
          </div>
          <div className="flex space-x-3 text-[10px] font-bold font-mono text-slate-500 mt-2 sm:mt-0">
            <span className="flex items-center text-emerald-600">● Excellent (≥90%)</span>
            <span className="flex items-center text-amber-600">● Good (75-89%)</span>
            <span className="flex items-center text-rose-600">● Critical (&lt;75%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Retention Tracker */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-blue-500 uppercase font-mono tracking-widest block mb-0.5">Rentation Rate</span>
                <p className="text-xs text-slate-600 font-semibold">Client Loyalty Retention</p>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-black border text-xs ${getRangeBadge(branchRetentionRate)}`}>
                {branchRetentionRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, branchRetentionRate)}%` }} className={`h-full ${branchRetentionRate >= 90 ? "bg-emerald-500" : branchRetentionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Active: {branchActiveCount} Clients</span>
                <span>Dormant: {dormantCount} Clients</span>
              </div>
            </div>
          </div>

          {/* Onboarding Tracker */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-indigo-500 uppercase font-mono tracking-widest block mb-0.5">Onboarding Performance</span>
                <p className="text-xs text-slate-600 font-semibold">Monthly Onboarding (Target: 10)</p>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-black border text-xs ${getRangeBadge(branchOnboardingRate)}`}>
                {branchOnboardingRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, branchOnboardingRate)}%` }} className={`h-full ${branchOnboardingRate >= 90 ? "bg-emerald-500" : branchOnboardingRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Enrolled July: {branchRegThisMonth}</span>
                <span>Monthly Target: {branchOnboardingTarget}</span>
              </div>
            </div>
          </div>

          {/* Collection Tracker */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-emerald-500 uppercase font-mono tracking-widest block mb-0.5">Collection Performance</span>
                <p className="text-xs text-slate-600 font-semibold">PSO Recovery (Target: 100%)</p>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-black border text-xs ${getRangeBadge(branchCollectionRate)}`}>
                {branchCollectionRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, branchCollectionRate)}%` }} className={`h-full ${branchCollectionRate >= 90 ? "bg-emerald-500" : branchCollectionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Recovered: KES {totalCollectionsSum.toLocaleString()}</span>
                <span>Arrears: KES {defaultsSum.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left columns: Officer Performance leaderboard */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Officer (PLO) Target & Performance Leaderboard</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 font-mono uppercase">
                  <th className="py-2">Officer Name</th>
                  <th className="py-2 text-center">Clients (Total/Dormant)</th>
                  <th className="py-2 text-center">Retention</th>
                  <th className="py-2 text-center">Onboarding %</th>
                  <th className="py-2 text-center">Collection %</th>
                  <th className="py-2 text-right">Portfolio (KES)</th>
                  <th className="py-2 text-right">Recoveries (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {ploPerformance.map((plo, i) => (
                  <tr key={plo.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-semibold text-slate-800 flex items-center">
                      <span className="w-5 h-5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold inline-flex items-center justify-center mr-2">
                        #{i + 1}
                      </span>
                      {plo.fullName}
                    </td>
                    <td className="py-3 text-center text-slate-600 font-mono">
                      {plo.clientCount} <span className="text-slate-300">/</span> <span className="text-rose-500 bg-rose-50 px-1 py-0.25 rounded font-bold">{plo.dormantCount}</span>
                    </td>
                    <td className="py-3 text-center font-mono font-bold">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getRangeBadge(plo.retention)}`}>
                        {plo.retention.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono font-bold">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getRangeBadge(plo.onboarding)}`}>
                        {plo.onboarding.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono font-bold">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getRangeBadge(plo.collectionRate)}`}>
                        {plo.collectionRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-600 font-mono">KES {plo.outstanding.toLocaleString()}</td>
                    <td className="py-3 text-right text-emerald-600 font-bold font-mono">KES {plo.collections.toLocaleString()}</td>
                  </tr>
                ))}
                {ploPerformance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No Loan Officers registered in this branch.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Branch KPI Performance charts & Dormancy SMS trigger console */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Local Yield Indicator</h3>
              <p className="text-xs text-slate-400">Active metrics of branch productivity.</p>
            </div>

            {/* Graphical gauges */}
            <div className="space-y-4">
              
              {/* KPI 1: Collections Efficiency */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Recovery Efficiency</span>
                  <span className="text-emerald-600">
                    {totalIssuedSum > 0 ? Math.round((totalCollectionsSum / totalIssuedSum) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${totalIssuedSum > 0 ? (totalCollectionsSum / totalIssuedSum) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Issued: KES {totalIssuedSum.toLocaleString()}</span>
                  <span>Collected: KES {totalCollectionsSum.toLocaleString()}</span>
                </div>
              </div>

              {/* KPI 2: Arrears Exposure */}
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Portfolio Default Exposure</span>
                  <span className="text-rose-600">
                    {branchOutstandingSum > 0 ? ((defaultsSum / branchOutstandingSum) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${branchOutstandingSum > 0 ? (defaultsSum / branchOutstandingSum) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Healthy Principal</span>
                  <span>At Risk: KES {defaultsSum.toLocaleString()}</span>
                </div>
              </div>

              {/* General Advice Capsule */}
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50 mt-4">
                <div className="flex items-start space-x-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800">Operational Target</p>
                    <p className="text-blue-700 text-[11px] mt-0.5">Ensure active field officers verify business inventories on-site twice weekly to suppress late payment risks below 5% PAR.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Dormant Branch Clients SMS Trigger Hub */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Dormant Client Quick Recovery</h3>
              <p className="text-xs text-slate-400">Clients with no active outstanding loans. Trigger a system SMS invitation to re-engage.</p>
            </div>

            <div className="max-h-[250px] overflow-y-auto space-y-2.5 pr-1">
              {dormantClients.map(c => {
                const assignedPlo = staff.find(s => s.id === c.assignedOfficerId);
                return (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex flex-col justify-between gap-2 hover:bg-slate-100/50 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.fullName}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{c.businessName} • {c.businessType}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Assigned: {assignedPlo?.fullName || "Unassigned"}</p>
                    </div>
                    <button
                      onClick={() => handleWakeUpClient(c)}
                      className="w-full text-center px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center justify-center space-x-1"
                    >
                      <span>Re-engage with SMS</span>
                    </button>
                  </div>
                );
              })}
              {dormantClients.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 italic">No dormant clients in this branch!</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
