import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { Search, ShieldCheck, Mail, Calendar, Eye, AlertOctagon } from "lucide-react";
import { UserRole } from "../types.js";

export const AuditLogs: React.FC = () => {
  const { state, currentUser } = useApp();
  const { auditLogs, smsNotifications } = state;

  const [searchAudit, setSearchAudit] = useState("");
  const [searchSms, setSearchSms] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "sms">("audit");

  const isMD = currentUser?.role === UserRole.MD;
  const isBM = currentUser?.role === UserRole.BRANCH_MANAGER;
  const isFinance = currentUser?.role === UserRole.FINANCE;

  if (!currentUser || (!isMD && !isBM && !isFinance)) {
    return (
      <div className="p-8 bg-white rounded-xl border border-rose-100 text-center text-rose-600 max-w-lg mx-auto my-12">
        <AlertOctagon className="h-12 w-12 mx-auto text-rose-500 mb-3" />
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have the required permissions to view immutable compliance logs or simulated communications.</p>
      </div>
    );
  }

  // Filter logs based on search
  const filteredAudits = auditLogs.filter(log => {
    // If not MD, only show logs of staff in the same branch as the logged-in user
    if (!isMD) {
      const staffMember = state.staff.find(s => s.id === log.userId);
      if (staffMember && staffMember.branchId !== currentUser?.branchId) {
        return false;
      }
    }
    const searchString = log.userFullName.toLowerCase() + log.action.toLowerCase() + log.details.toLowerCase();
    return searchString.includes(searchAudit.toLowerCase());
  });

  const filteredSms = smsNotifications.filter(sms => {
    // If not MD, only show SMS notifications for clients in the same branch as the logged-in user
    if (!isMD) {
      const client = state.clients.find(c => c.id === sms.clientId);
      if (client && client.branchId !== currentUser?.branchId) {
        return false;
      }
    }
    const searchString = sms.clientName.toLowerCase() + sms.loanRef.toLowerCase() + sms.phoneNumber + sms.message.toLowerCase();
    return searchString.includes(searchSms.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Compliance & simulated Communications</h1>
          <p className="text-xs text-slate-500">Track operations trails, security events, and client outgoing SMS alerts.</p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 rounded-lg p-1.5 shrink-0 border border-slate-200">
          <button
            id="subtab-audit-logs"
            onClick={() => setActiveSubTab("audit")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === "audit" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            Compliance Audit Trails
          </button>
          <button
            id="subtab-sms-logs"
            onClick={() => setActiveSubTab("sms")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSubTab === "sms" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            Outgoing SMS Records
          </button>
        </div>
      </div>

      {activeSubTab === "audit" ? (
        /* AUDIT TRAILS BOARD */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail records..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="flex items-center space-x-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 font-bold px-2 py-1 rounded font-mono">
              <ShieldCheck className="h-4 w-4" />
              <span>Immutable Ledger</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Executive/Officer</th>
                  <th className="px-6 py-3.5">Designated Role</th>
                  <th className="px-6 py-3.5">Operational Action</th>
                  <th className="px-6 py-3.5">Audit Event Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAudits.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-800">
                      {log.userFullName}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded font-mono uppercase">
                        {log.userRole.split(" ")[0]}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-blue-700 font-mono">
                      {log.action}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                ))}
                {filteredAudits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No audit logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* OUTGOING SMS RECORDS BOARD */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search outgoing client messages..."
                value={searchSms}
                onChange={(e) => setSearchSms(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="flex items-center space-x-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 font-bold px-2 py-1 rounded font-mono">
              <Mail className="h-4 w-4" />
              <span>SMS Dispatch Simulator</span>
            </span>
          </div>

          {/* Graphical SMS Feed Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50/50">
            {filteredSms.map(sms => (
              <div 
                id={`sms-card-${sms.id}`}
                key={sms.id} 
                className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3 relative overflow-hidden shadow-xs hover:border-blue-200 transition-all"
              >
                {/* Outward header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{sms.clientName}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Contact: {sms.phoneNumber}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm uppercase tracking-wider font-mono ${
                    sms.type === "Payment" || sms.type === "Repaid" ? "bg-emerald-50 text-emerald-600" :
                    sms.type === "Late" || sms.type === "Demand" ? "bg-rose-50 text-rose-600" :
                    sms.type === "Approved" || sms.type === "Disbursement" ? "bg-blue-50 text-blue-600" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {sms.type}
                  </span>
                </div>

                {/* Simulated SMS Bubble visual */}
                <div className="bg-slate-50 p-3 rounded-lg text-xs border border-slate-100 text-slate-700 italic relative leading-relaxed font-sans">
                  "{sms.message}"
                  <span className="absolute right-2 bottom-1.5 text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider">sent</span>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1">
                  <span>Loan Ref: <strong className="text-slate-600 font-bold">{sms.loanRef}</strong></span>
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(sms.sentAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {filteredSms.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No outgoing SMS dispatches recorded.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
