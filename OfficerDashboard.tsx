import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { 
  Users, 
  DollarSign, 
  Award, 
  MapPin, 
  Calendar, 
  Plus, 
  MessageSquare, 
  MailWarning, 
  CheckCircle,
  FileText
} from "lucide-react";

interface VisitLog {
  id: string;
  clientName: string;
  businessName: string;
  notes: string;
  date: string;
  status: "Completed" | "Scheduled";
}

export const OfficerDashboard: React.FC = () => {
  const { state, currentUser, sendSms, updateState, logAction, systemDate } = useApp();
  const { clients, loans, transactions } = state;

  if (!currentUser) return null;

  // Filter to Loan Officer
  const officerClients = clients.filter(c => c.assignedOfficerId === currentUser.id);
  const clientIds = officerClients.map(c => c.id);

  const officerLoans = loans.filter(l => clientIds.includes(l.clientId));
  const activeLoans = officerLoans.filter(l => l.status === "Disbursed" || l.status === "In Arrears" || l.status === "Defaulted");

  // Outstanding Book
  const totalOutstanding = officerLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  // Collections (repayments)
  const collectionsTx = transactions.filter(t => t.type === "Repayment" && clientIds.includes(t.clientId));
  const totalCollections = collectionsTx.reduce((sum, t) => sum + t.amount, 0);

  // Arrears list (Disbursed, past due)
  const arrearsLoans = officerLoans.filter(l => {
    if (l.status !== "Disbursed" && l.status !== "In Arrears" && l.status !== "Defaulted") return false;
    if (!l.dueDate) return false;
    const todayObj = new Date(systemDate);
    const dueDate = new Date(l.dueDate);
    return dueDate < todayObj;
  });
  const totalArrears = arrearsLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  // PLO-specific Target Metrics (Retention, Onboarding, Collection)
  const currentStaffProfile = state.staff.find(s => s.id === currentUser.id) || currentUser;

  const dormantClients = officerClients.filter(c => {
    const hasActiveLoan = loans.some(l => l.clientId === c.id && (l.status === "Disbursed" || l.status === "In Arrears" || l.status === "Defaulted"));
    return !hasActiveLoan;
  });
  const dormantCount = dormantClients.length;

  const activeCount = officerClients.length - dormantCount;
  const PLORetentionRate = officerClients.length > 0 ? (activeCount / officerClients.length) * 100 : 0;

  const registeredThisMonth = officerClients.filter(c => c.registeredAt.startsWith("2026-07")).length;
  const onboardingTarget = currentStaffProfile.portfolioTargetClients || 5; // Pull target clients from MD-approved portfolio
  const PLOOnboardingRate = (registeredThisMonth / onboardingTarget) * 100;

  const collectionTargetPercent = currentStaffProfile.portfolioTargetCollectionPercent || 100; // Pull target collection % from portfolio
  const baseCollectionRate = (totalCollections + totalArrears) > 0 ? (totalCollections / (totalCollections + totalArrears)) * 100 : 100;
  const PLOCollectionRate = collectionTargetPercent > 0 ? (baseCollectionRate / collectionTargetPercent) * 100 : baseCollectionRate;

  // SMS Re-engagement Trigger for PLO's own Dormant Clients
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
    await logAction("Dormant Re-engagement", `PLO ${currentUser.fullName} dispatched promotional engagement SMS to dormant client "${client.fullName}"`);
    alert(`Engagement SMS successfully dispatched to ${client.fullName} (${client.phoneNumber})`);
  };

  const getRangeBadge = (val: number) => {
    if (val >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (val >= 75) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100 animate-pulse";
  };

  // Mock Visit logs - initialized in state so PLO can add more
  const [visits, setVisits] = useState<VisitLog[]>([
    { id: "v-1", clientName: "Wycliffe Oparanya", businessName: "Oparanya Enterprises", notes: "Discussed cash-flow projections. Client repaid fully on due date.", date: "2026-07-05", status: "Completed" },
    { id: "v-2", clientName: "Mercy Wanjiku", businessName: "Kakamega Agro-Tech Support", notes: "Inspected inventory. Warehouse fully stocked with seed. Recommended 2-week top-up loan.", date: "2026-07-12", status: "Completed" },
    { id: "v-3", clientName: "Timothy Wetangula", businessName: "Wetangula Transporters", notes: "Arrears call. Bike was in garage; back in operation today. Promised part payment by Friday.", date: "2026-07-14", status: "Completed" },
    { id: "v-4", clientName: "Phyllis Nabwera", businessName: "Elegant Sheen Salon", notes: "Routine monthly field audit. Check salon equipment and cash logs.", date: "2026-07-18", status: "Scheduled" }
  ]);

  const [newVisitClient, setNewVisitClient] = useState("");
  const [newVisitNotes, setNewVisitNotes] = useState("");
  const [newVisitDate, setNewVisitDate] = useState("2026-07-16");

  const [sendingId, setSendingId] = useState<string>("");

  const handleAddVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitClient || !newVisitNotes) return;

    const client = clients.find(c => c.id === newVisitClient);
    if (!client) return;

    const newLog: VisitLog = {
      id: `v-${Date.now()}`,
      clientName: client.fullName,
      businessName: client.businessName,
      notes: newVisitNotes,
      date: newVisitDate,
      status: "Scheduled"
    };

    setVisits([newLog, ...visits]);
    setNewVisitClient("");
    setNewVisitNotes("");
  };

  const handleSendReminderSms = async (loanId: string, type: "Reminder" | "Late" | "Demand") => {
    setSendingId(loanId);
    const loan = loans.find(l => l.id === loanId);
    const client = clients.find(c => c.id === loan?.clientId);
    if (loan && client) {
      if (type === "Reminder") {
        await sendSms(client.id, "Reminder", loan.loanNumber, loan.outstandingBalance.toLocaleString());
      } else if (type === "Late") {
        await sendSms(client.id, "Late", loan.loanNumber, (loan.outstandingBalance * 0.12).toFixed(0));
      } else if (type === "Demand") {
        await sendSms(client.id, "Demand", loan.loanNumber);
      }
    }
    setTimeout(() => {
      setSendingId("");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* PLO Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Loan Officer Dashboard</h1>
          <p className="text-xs text-slate-500">Field management of assigned Kakamega accounts.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono">
          <span>Assigned Branch Staff:</span>
          <strong className="text-blue-700">{currentUser.fullName}</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Assigned Clients</p>
            <p className="text-lg font-bold text-slate-900">{officerClients.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Under Kakamega County</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Outstanding Principal</p>
            <p className="text-lg font-bold text-slate-900 font-mono">KES {totalOutstanding.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{activeLoans.length} active credits</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">My Recoveries</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">KES {totalCollections.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Disburse Limit: KES {(currentStaffProfile.portfolioDisbursementLimit || 400000).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Arrears/Late Balance</p>
            <p className="text-lg font-bold text-rose-600 font-mono">KES {totalArrears.toLocaleString()}</p>
            <p className="text-[11px] text-rose-500 font-medium mt-0.5">{arrearsLoans.length} Overdue loans</p>
          </div>
        </div>

      </div>

      {/* Target Performance Range Tracking Hub */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">My Target Performance Hub</h3>
            <p className="text-[10px] text-slate-500 font-medium">Monthly performance target metrics for PLO {currentUser.fullName}</p>
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
                <span className="text-[9px] font-bold text-blue-500 uppercase font-mono tracking-widest block mb-0.5">Retention Rate</span>
                <p className="text-xs text-slate-600 font-semibold">Client Loyalty Retention</p>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-black border text-xs ${getRangeBadge(PLORetentionRate)}`}>
                {PLORetentionRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, PLORetentionRate)}%` }} className={`h-full ${PLORetentionRate >= 90 ? "bg-emerald-500" : PLORetentionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Active: {activeCount} Clients</span>
                <span>Dormant: {dormantCount} Clients</span>
              </div>
            </div>
          </div>

          {/* Onboarding Tracker */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-indigo-500 uppercase font-mono tracking-widest block mb-0.5">Onboarding Performance</span>
                <p className="text-xs text-slate-600 font-semibold">Monthly Onboarding (Target: {onboardingTarget})</p>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-black border text-xs ${getRangeBadge(PLOOnboardingRate)}`}>
                {PLOOnboardingRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, PLOOnboardingRate)}%` }} className={`h-full ${PLOOnboardingRate >= 90 ? "bg-emerald-500" : PLOOnboardingRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Enrolled July: {registeredThisMonth}</span>
                <span>Target: {onboardingTarget}</span>
              </div>
            </div>
          </div>

          {/* Collection Tracker */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-emerald-500 uppercase font-mono tracking-widest block mb-0.5">Collection Performance</span>
                <p className="text-xs text-slate-600 font-semibold">PLO Recovery (Target: {collectionTargetPercent}%)</p>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-black border text-xs ${getRangeBadge(PLOCollectionRate)}`}>
                {PLOCollectionRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, PLOCollectionRate)}%` }} className={`h-full ${PLOCollectionRate >= 90 ? "bg-emerald-500" : PLOCollectionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Recovered: KES {totalCollections.toLocaleString()}</span>
                <span>Arrears: KES {totalArrears.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ARREARS RESOLUTION ENGINE */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <MailWarning className="h-5 w-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Arrears Warning Board & SMS Alerts</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 font-mono uppercase">
                  <th className="py-2">Client / Business</th>
                  <th className="py-2 text-right">Liability (KES)</th>
                  <th className="py-2 text-right">Days Past Due</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {arrearsLoans.map(loan => {
                  const client = clients.find(c => c.id === loan.clientId);
                  const dueDate = new Date(loan.dueDate || "");
                  const daysLate = Math.floor((new Date(systemDate).getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
                  
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{client?.fullName}</p>
                        <p className="text-[10px] text-slate-500">{client?.businessName} • {client?.phoneNumber}</p>
                      </td>
                      <td className="py-3 text-right font-semibold font-mono text-slate-700">
                        KES {loan.outstandingBalance.toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-rose-600 font-bold font-mono">
                        {daysLate} Days Overdue
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-remind-sms-${loan.id}`}
                            onClick={() => handleSendReminderSms(loan.id, "Reminder")}
                            disabled={sendingId === loan.id}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-semibold transition-all"
                            title="Send repayment reminder"
                          >
                            {sendingId === loan.id ? "Sent" : "Remind"}
                          </button>
                          <button
                            id={`btn-late-sms-${loan.id}`}
                            onClick={() => handleSendReminderSms(loan.id, "Late")}
                            disabled={sendingId === loan.id}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-semibold transition-all"
                            title="Send late payment warning with penalty calculation"
                          >
                            Penalty Alert
                          </button>
                          <button
                            id={`btn-demand-sms-${loan.id}`}
                            onClick={() => handleSendReminderSms(loan.id, "Demand")}
                            disabled={sendingId === loan.id}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-semibold transition-all"
                            title="Send severe arrears demand letter notice"
                          >
                            Demand Notice
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {arrearsLoans.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">Excellent! No assigned clients are currently in arrears.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Field Visits Diary & Dormant Clients SMS Hub */}
        <div className="space-y-6">
          {/* FIELD VISITS TRACKER */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Field Visits Diary</h3>
              </div>
            </div>

            {/* Add Visit Form */}
            <form onSubmit={handleAddVisit} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Schedule New Field Visit</p>
              <div className="space-y-1">
                <select
                  value={newVisitClient}
                  onChange={(e) => setNewVisitClient(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-hidden"
                  required
                >
                  <option value="">Select client...</option>
                  {officerClients.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.businessName})</option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Audit observations / visit notes..."
                  value={newVisitNotes}
                  onChange={(e) => setNewVisitNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-hidden"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={newVisitDate}
                  onChange={(e) => setNewVisitDate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded p-1 focus:outline-hidden"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs shrink-0 flex items-center justify-center font-bold px-2"
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  Add
                </button>
              </div>
            </form>

            {/* Visits list */}
            <div className="space-y-3 overflow-y-auto max-h-56 pr-1 font-mono">
              {visits.map(v => (
                <div key={v.id} className="p-2.5 rounded-lg border border-slate-100 bg-white shadow-xs space-y-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs">{v.clientName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${v.status === "Completed" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>{v.status}</span>
                  </div>
                  <p className="text-slate-400 font-bold">{v.businessName}</p>
                  <p className="text-slate-600 italic mt-1 font-sans">"{v.notes}"</p>
                  <p className="text-[9px] text-slate-400 text-right mt-1">Visit Date: {v.date}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Dormant Clients SMS Trigger Hub */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">My Dormant Clients Recovery</h3>
              <p className="text-xs text-slate-400 font-sans">My assigned clients with no active outstanding loans. Re-engage them via promo SMS.</p>
            </div>

            <div className="max-h-[250px] overflow-y-auto space-y-2.5 pr-1 font-mono">
              {dormantClients.map(c => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex flex-col justify-between gap-2 hover:bg-slate-100/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{c.fullName}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{c.businessName} • {c.businessType}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Phone: {c.phoneNumber}</p>
                  </div>
                  <button
                    onClick={() => handleWakeUpClient(c)}
                    className="w-full text-center px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center justify-center space-x-1"
                  >
                    <span>Re-engage with SMS</span>
                  </button>
                </div>
              ))}
              {dormantClients.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 italic font-sans">Excellent! No dormant clients assigned to you.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
