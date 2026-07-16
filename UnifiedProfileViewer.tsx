import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { UserRole, Client, Staff, Loan, Transaction, VaultDocument, AuditLog, SmsNotification } from "../types.js";
import { 
  User, Briefcase, FileText, Landmark, TrendingUp, DollarSign, 
  Award, Calendar, AlertTriangle, ShieldCheck, History, Printer, 
  Download, ZoomIn, ZoomOut, Save, Edit, Plus, Trash2, Mail, 
  Send, CheckCircle2, XCircle, RefreshCw, Eye, ChevronRight, Scale,
  CreditCard
} from "lucide-react";

export const UnifiedProfileViewer: React.FC = () => {
  const { 
    state, 
    updateState, 
    currentUser, 
    systemDate, 
    logAction,
    sendSms,
    currentView,
    navigateTo,
    activeProfileTab,
    setActiveProfileTab
  } = useApp();

  const isClient = currentView.entityType === "Client";
  const entityId = currentView.entityId;

  // Find the exact active entity
  const activeClient = isClient ? state.clients.find(c => c.id === entityId) : null;
  const activeStaff = !isClient ? state.staff.find(s => s.id === entityId) : null;

  // Interactive local states
  const [isEditing, setIsEditing] = useState(false);
  const [editClientForm, setEditClientForm] = useState<Partial<Client>>({});
  const [editStaffForm, setEditStaffForm] = useState<Partial<Staff>>({});
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Custom states for sub-features
  const [customSmsText, setCustomSmsText] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  
  // Doc Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Client Registry");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDetails, setUploadDetails] = useState("");

  // Leave Form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState("Annual");
  const [leaveDays, setLeaveDays] = useState(5);
  const [leaveReason, setLeaveReason] = useState("");

  // Disciplinary Form
  const [showDiscForm, setShowDiscForm] = useState(false);
  const [discTitle, setDiscTitle] = useState("");
  const [discDetails, setDiscDetails] = useState("");

  // Initialize edit forms on load
  React.useEffect(() => {
    if (activeClient) {
      setEditClientForm(activeClient);
    }
    if (activeStaff) {
      setEditStaffForm(activeStaff);
    }
    setSelectedDoc(null);
  }, [entityId, currentView.entityType]);

  if (isClient && !activeClient) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Client Profile Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested client record does not exist or has been archived.</p>
        <button onClick={() => navigateTo("clients")} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
          Return to Clients List
        </button>
      </div>
    );
  }

  if (!isClient && !activeStaff) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Staff Member Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested staff record does not exist or was deleted.</p>
        <button onClick={() => navigateTo("staff")} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
          Return to Staff Directory
        </button>
      </div>
    );
  }

  // --- CLIENT CALCULATIONS ---
  const clientLoans = activeClient ? state.loans.filter(l => l.clientId === activeClient.id) : [];
  const clientTxs = activeClient ? state.transactions.filter(t => t.clientId === activeClient.id) : [];
  const clientDocs = activeClient ? (state.documents || []).filter(d => d.ownerType === "Client" && d.ownerName.includes(activeClient.fullName)) : [];
  const clientSms = activeClient ? (state.smsNotifications || []).filter(s => s.clientId === activeClient.id) : [];
  const clientLogs = activeClient ? state.auditLogs.filter(log => log.details.toLowerCase().includes(activeClient.fullName.toLowerCase()) || log.details.includes(activeClient.id)) : [];

  // --- STAFF CALCULATIONS ---
  const staffPortfolioLoans = activeStaff ? state.loans.filter(l => {
    const client = state.clients.find(c => c.id === l.clientId);
    return client?.assignedOfficerId === activeStaff.id;
  }) : [];
  const staffTxs = activeStaff ? state.transactions.filter(t => t.recordedBy === activeStaff.id) : [];
  const staffDocs = activeStaff ? (state.documents || []).filter(d => d.ownerType === "Staff" && d.ownerName.includes(activeStaff.fullName)) : [];
  const staffLogs = activeStaff ? state.auditLogs.filter(log => log.userId === activeStaff.id) : [];

  // HR Specific Staff items (mocked and stored locally / state-linked)
  const isHRAuthorized = currentUser?.role === UserRole.HR || currentUser?.role === UserRole.MD || currentUser?.role === UserRole.IT;
  const staffLeaveRecords = [
    { type: "Annual", days: 12, status: "Approved", startDate: "2026-04-10", reason: "Resting leave" },
    { type: "Sick Leave", days: 3, status: "Approved", startDate: "2026-05-18", reason: "Medical checkup" }
  ];
  const staffDisciplinaryRecords = [
    { title: "Dual Control Compliance", date: "2026-02-15", details: "Signed understanding of dual authorization limits.", status: "Resolved" }
  ];

  // Save Client Changes
  const handleSaveClient = async () => {
    if (!activeClient) return;
    const updatedClients = state.clients.map(c => c.id === activeClient.id ? { ...c, ...editClientForm } : c);
    await updateState({ ...state, clients: updatedClients });
    await logAction("Update Client Information", `Successfully edited client core details for ${activeClient.fullName}`);
    setIsEditing(false);
  };

  // Save Staff Changes
  const handleSaveStaff = async () => {
    if (!activeStaff) return;
    const updatedStaff = state.staff.map(s => s.id === activeStaff.id ? { ...s, ...editStaffForm } : s);
    await updateState({ ...state, staff: updatedStaff });
    await logAction("Update Staff Information", `Successfully edited employee core details for ${activeStaff.fullName}`);
    setIsEditing(false);
  };

  // Waiver / Writeoff Penalty (MD / Finance Only)
  const handleWaivePenalty = async (loanId: string, amount: number) => {
    if (currentUser?.role !== UserRole.MD && currentUser?.role !== UserRole.FINANCE) {
      alert("Clearance Level 3 Required: Managing Director or Finance Manager only.");
      return;
    }
    const targetLoan = state.loans.find(l => l.id === loanId);
    if (!targetLoan) return;

    const newWaiverTx: Transaction = {
      id: `tx-waive-${Date.now()}`,
      loanId,
      clientId: targetLoan.clientId,
      amount: -amount,
      type: "PenaltyCharge",
      date: systemDate,
      recordedBy: currentUser.id,
      notes: "AUTHORIZED WAIVER: Applied standard credit relief rules."
    };

    const updatedLoans = state.loans.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          penaltyAmount: Math.max(0, l.penaltyAmount - amount),
          outstandingBalance: Math.max(0, l.outstandingBalance - amount)
        };
      }
      return l;
    });

    await updateState({
      ...state,
      loans: updatedLoans,
      transactions: [newWaiverTx, ...state.transactions]
    });

    await logAction("Waive Penalty Charge", `MD/Finance authorized a penalty waiver of KES ${amount} for Loan ${targetLoan.loanNumber}`);
  };

  // Doc Approval Workflow
  const handleUpdateDocStatus = async (docId: string, newStatus: "Verified" | "Pending Review") => {
    const updatedDocs = (state.documents || []).map(d => {
      if (d.id === docId) {
        return { ...d, status: newStatus };
      }
      return d;
    });
    await updateState({ ...state, documents: updatedDocs });
    
    // Update selected doc to reflect change
    if (selectedDoc && selectedDoc.id === docId) {
      setSelectedDoc({ ...selectedDoc, status: newStatus });
    }

    await logAction("Modify Document Status", `Changed validation status of document ${docId} to ${newStatus}`);
  };

  // Custom SMS Sender
  const handleSendCustomSms = async () => {
    if (!activeClient || !customSmsText.trim()) return;
    setSmsSending(true);
    try {
      const newSms: SmsNotification = {
        id: `sms-c-${Date.now()}`,
        clientId: activeClient.id,
        clientName: activeClient.fullName,
        phoneNumber: activeClient.phoneNumber,
        loanRef: "AMROW-CORE",
        message: customSmsText,
        type: "Welcome", // custom
        sentAt: systemDate
      };

      await updateState({
        ...state,
        smsNotifications: [newSms, ...(state.smsNotifications || [])]
      });

      await logAction("Dispatch SMS Reminder", `Manual SMS dispatched to ${activeClient.fullName}: "${customSmsText}"`);
      setCustomSmsText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSmsSending(false);
    }
  };

  // Doc Upload Action
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocName.trim()) return;

    const newDoc: VaultDocument = {
      id: `doc-${Date.now()}`,
      name: uploadDocName.endsWith(".pdf") ? uploadDocName : `${uploadDocName}.pdf`,
      ownerName: isClient ? activeClient!.fullName : activeStaff!.fullName,
      ownerType: isClient ? "Client" : "Staff",
      category: uploadCategory,
      uploadedAt: systemDate,
      status: "Pending Review",
      size: "1.4 MB",
      mimetype: "application/pdf",
      details: uploadDetails || "Uploaded via dual-compliance browser utility."
    };

    await updateState({
      ...state,
      documents: [newDoc, ...(state.documents || [])]
    });

    await logAction("Upload Registry Document", `Uploaded new compliance file ${newDoc.name} for ${newDoc.ownerName}`);
    
    // reset form
    setUploadDocName("");
    setUploadDetails("");
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Profile Banner Card */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-extrabold text-2xl shadow-inner">
            {isClient ? <User className="h-8 w-8" /> : <Briefcase className="h-8 w-8" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight">{isClient ? activeClient?.fullName : activeStaff?.fullName}</h2>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                isClient 
                  ? activeClient?.status === "Active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700 text-slate-400"
                  : activeStaff?.status === "Active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }`}>
                {isClient ? activeClient?.status : activeStaff?.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {isClient 
                ? `Client Registry Ref: CL-${activeClient?.idNumber} • Kakamega Area Office` 
                : `${activeStaff?.role} • HQ Staff Key ID: ST-${activeStaff?.id}`}
            </p>
          </div>
        </div>

        {/* Banner Smart Action Buttons */}
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)} 
                className="px-3.5 py-1.5 bg-slate-800 text-xs text-slate-300 font-bold rounded-xl border border-slate-700 hover:bg-slate-750 transition"
              >
                Cancel
              </button>
              <button 
                onClick={isClient ? handleSaveClient : handleSaveStaff} 
                className="px-4 py-1.5 bg-blue-600 text-xs text-white font-bold rounded-xl hover:bg-blue-500 transition flex items-center space-x-1.5 shadow-lg shadow-blue-500/20"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)} 
                className="px-4 py-1.5 bg-white text-xs text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition flex items-center space-x-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
              
              {/* Export Button */}
              <button 
                onClick={() => window.print()}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                title="Print Audit Snapshot"
              >
                <Printer className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. PROFILE TABBED CONTROLS */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* TAB CONTROLLERS SIDEBAR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-1 xl:sticky xl:top-20">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pb-2 border-b border-slate-100 mb-2">
            Profile Sections
          </p>
          {isClient ? (
            // --- CLIENT TABS ---
            <>
              {[
                { id: "personal", label: "Personal Information", icon: User },
                { id: "business", label: "Business Information", icon: Landmark },
                { id: "loans", label: "Loans & Applications", icon: CreditCard },
                { id: "transactions", label: "Repayment History", icon: TrendingUp },
                { id: "penalties", label: "Penalties & Charges", icon: AlertTriangle },
                { id: "demand", label: "Demand Letters", icon: Scale },
                { id: "documents", label: "Uploaded Documents", icon: FileText },
                { id: "sms", label: "Communication Logs", icon: Mail },
                { id: "audit", label: "System Audit Trail", icon: History }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveProfileTab(t.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all ${
                    activeProfileTab === t.id 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <t.icon className={`h-4 w-4 ${activeProfileTab === t.id ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{t.label}</span>
                </button>
              ))}
            </>
          ) : (
            // --- STAFF TABS ---
            <>
              {[
                { id: "personal", label: "Personal Information", icon: User },
                { id: "employment", label: "Employment Details", icon: Briefcase },
                { id: "department", label: "Department & Branch", icon: Landmark },
                { id: "performance", label: "Performance Metrics", icon: Award },
                { id: "payroll", label: "Payroll Information", icon: DollarSign, protected: true },
                { id: "documents", label: "Uploaded Documents", icon: FileText },
                { id: "leave", label: "Leave Records", icon: Calendar },
                { id: "disciplinary", label: "Compliance Reviews", icon: ShieldCheck },
                { id: "audit", label: "Employee Activity Logs", icon: History }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveProfileTab(t.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all ${
                    activeProfileTab === t.id 
                      ? "bg-violet-50 text-violet-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <t.icon className={`h-4 w-4 ${activeProfileTab === t.id ? "text-violet-600" : "text-slate-400"}`} />
                    <span>{t.label}</span>
                  </div>
                  {t.protected && (
                    <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1 uppercase font-bold">Role-Gated</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* ACTIVE PANEL CONTENT DISPLAY */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs min-h-[460px]">
            
            {/* ======================================= */}
            {/* ======= CLIENT TAB PANELS CONTENT ====== */}
            {/* ======================================= */}
            {isClient && activeClient && (
              <>
                {/* 1. Client Personal Info */}
                {activeProfileTab === "personal" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Personal Details</h3>
                      <span className="text-xs font-mono text-slate-400">UUID: {activeClient.id}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Registered Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editClientForm.fullName || ""}
                            onChange={(e) => setEditClientForm({ ...editClientForm, fullName: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeClient.fullName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">National ID Number</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editClientForm.idNumber || ""}
                            onChange={(e) => setEditClientForm({ ...editClientForm, idNumber: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeClient.idNumber}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Mobile Number</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editClientForm.phoneNumber || ""}
                            onChange={(e) => setEditClientForm({ ...editClientForm, phoneNumber: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeClient.phoneNumber}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned County Zone</label>
                        <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeClient.county} County Only</p>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Referee 1 (Name & Phone)</label>
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                placeholder="Referee Name"
                                value={editClientForm.referee1Name || ""}
                                onChange={(e) => setEditClientForm({ ...editClientForm, referee1Name: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                              />
                              <input
                                type="text"
                                placeholder="Referee Phone"
                                value={editClientForm.referee1Phone || ""}
                                onChange={(e) => setEditClientForm({ ...editClientForm, referee1Phone: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                              />
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-slate-800 bg-slate-50 p-2.5 rounded-xl">
                              {activeClient.referee1Name || "Not Provided"} ({activeClient.referee1Phone || "N/A"})
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Referee 2 (Name & Phone)</label>
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                placeholder="Referee Name"
                                value={editClientForm.referee2Name || ""}
                                onChange={(e) => setEditClientForm({ ...editClientForm, referee2Name: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                              />
                              <input
                                type="text"
                                placeholder="Referee Phone"
                                value={editClientForm.referee2Phone || ""}
                                onChange={(e) => setEditClientForm({ ...editClientForm, referee2Phone: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                              />
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-slate-800 bg-slate-50 p-2.5 rounded-xl">
                              {activeClient.referee2Name || "Not Provided"} ({activeClient.referee2Phone || "N/A"})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Client Business Info */}
                {activeProfileTab === "business" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Business Details & Underwriting</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registered Business Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editClientForm.businessName || ""}
                            onChange={(e) => setEditClientForm({ ...editClientForm, businessName: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeClient.businessName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Business Classification Type</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editClientForm.businessType || ""}
                            onChange={(e) => setEditClientForm({ ...editClientForm, businessType: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeClient.businessType}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Onboarding Date</label>
                        <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">
                          {new Date(activeClient.registeredAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Branch Zone Code</label>
                        <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">
                          {state.branches.find(b => b.id === activeClient.branchId)?.code || "AMR-KKG-01"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Client Loan History */}
                {activeProfileTab === "loans" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Historical & Active Credit Facilities</h3>
                      <button 
                        onClick={() => navigateTo("loans")}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-lg font-bold"
                      >
                        + Create Loan Request
                      </button>
                    </div>

                    {clientLoans.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        This client does not have any active or previous loan files registered.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 uppercase font-mono font-bold text-[10px]">
                              <th className="py-3">Loan Ref</th>
                              <th className="py-3">Disbursed Date</th>
                              <th className="py-3">Principal Amount</th>
                              <th className="py-3">Outstanding Balance</th>
                              <th className="py-3">Status</th>
                              <th className="py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {clientLoans.map(loan => (
                              <tr key={loan.id} className="hover:bg-slate-50/50">
                                <td className="py-3 font-bold text-slate-800">{loan.loanNumber}</td>
                                <td className="py-3 text-slate-600">
                                  {loan.disbursedAt ? new Date(loan.disbursedAt).toLocaleDateString() : "Pending Appraisal"}
                                </td>
                                <td className="py-3 font-mono font-bold text-slate-700">KES {loan.amountRequested.toLocaleString()}</td>
                                <td className="py-3 font-mono font-extrabold text-slate-900">KES {loan.outstandingBalance.toLocaleString()}</td>
                                <td className="py-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    loan.status === "In Arrears" || loan.status === "Defaulted"
                                      ? "bg-rose-100 text-rose-700"
                                      : loan.status === "Fully Repaid"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}>{loan.status}</span>
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => navigateTo("loans", "Loan", loan.id, `Loan ${loan.loanNumber}`)}
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center space-x-1 ml-auto"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Drill Down</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Client Transactions */}
                {activeProfileTab === "transactions" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Repayment & Disbursement History</h3>
                    </div>

                    {clientTxs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No transactions registered under this client's account.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 uppercase font-mono font-bold text-[10px]">
                              <th className="py-3">Receipt ID</th>
                              <th className="py-3">Transaction Date</th>
                              <th className="py-3">Classification</th>
                              <th className="py-3">Amount Charged/Paid</th>
                              <th className="py-3">Audit Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {clientTxs.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50/50">
                                <td className="py-3 font-mono font-bold text-slate-800">{tx.id.toUpperCase()}</td>
                                <td className="py-3 text-slate-600">{new Date(tx.date).toLocaleString()}</td>
                                <td className="py-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    tx.type === "Repayment" 
                                      ? "bg-emerald-100 text-emerald-700" 
                                      : tx.type === "Disbursement" 
                                      ? "bg-blue-100 text-blue-700" 
                                      : "bg-amber-100 text-amber-700"
                                  }`}>{tx.type}</span>
                                </td>
                                <td className="py-3 font-mono font-extrabold text-slate-900">
                                  {tx.amount < 0 ? "-" : ""}KES {Math.abs(tx.amount).toLocaleString()}
                                </td>
                                <td className="py-3 text-slate-500 italic max-w-xs truncate">{tx.notes || "Standard audit tracking entry."}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Client Penalties */}
                {activeProfileTab === "penalties" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Applied Penalty Charges & Waive Authorizations</h3>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start space-x-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">AMROW Late Repayment Policies (Kakamega Zone)</p>
                        <p className="text-slate-600 mt-1 leading-relaxed">
                          - **Day 1 to Day 3 Overdue**: KES 100 applied daily (Max KES 300 total).<br />
                          - **Day 4 Overdue**: Loan status escalates to **Defaulted**. A 12% static penalty is applied to the outstanding principal. Only the Managing Director or Finance Manager may authorize a waiver.
                        </p>
                      </div>
                    </div>

                    {clientLoans.filter(l => l.penaltyAmount > 0).length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        Excellent Credit Rating: This client currently has no penalty or arrears charges applied.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {clientLoans.filter(l => l.penaltyAmount > 0).map(loan => (
                          <div key={loan.id} className="border border-rose-100 rounded-2xl p-4 bg-rose-50/20 flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Loan Facility: {loan.loanNumber}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-1">
                                Applied Penalty Balance: <strong className="text-rose-600">KES {loan.penaltyAmount.toLocaleString()}</strong> (Accumulated late days or 12% default)
                              </p>
                            </div>
                            
                            {/* MD/Finance Waiver Button */}
                            {(currentUser?.role === UserRole.MD || currentUser?.role === UserRole.FINANCE) ? (
                              <button
                                onClick={() => handleWaivePenalty(loan.id, loan.penaltyAmount)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl flex items-center space-x-1.5 shadow-md shadow-rose-600/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Authorize Full Waiver</span>
                              </button>
                            ) : (
                              <div className="text-[10px] text-slate-400 bg-slate-100 rounded px-2.5 py-1 flex items-center space-x-1">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Waive Requires MD/Finance Authorization</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Client Demand Letters */}
                {activeProfileTab === "demand" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Legal Demand Letters (Defaulted Loans)</h3>
                    </div>

                    {clientLoans.filter(l => l.status === "Defaulted").length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No defaulted loans found. No demand letters are required.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {clientLoans.filter(l => l.status === "Defaulted").map(loan => (
                          <div key={loan.id} className="border border-slate-200 rounded-3xl p-6 bg-slate-50/50 shadow-xs relative">
                            {/* Demand Letter Content */}
                            <div className="space-y-4 font-serif text-slate-800 text-xs leading-relaxed">
                              <div className="text-center border-b pb-4 mb-4">
                                <h4 className="font-bold text-base uppercase tracking-wider text-slate-900 font-sans">AMROW CAPITAL LTD</h4>
                                <p className="text-[10px] font-sans text-slate-500">PO Box 4820-50100, Kakamega Head Office • Tel: 0700-AMROW-CAP</p>
                              </div>
                              <p className="text-right font-sans font-bold text-[10px] text-slate-500">DATE: {new Date(systemDate).toLocaleDateString()}</p>
                              <div className="font-sans">
                                <p className="font-bold">TO: {activeClient.fullName}</p>
                                <p>ID NUMBER: {activeClient.idNumber}</p>
                                <p>MOBILE: {activeClient.phoneNumber}</p>
                              </div>
                              <h5 className="font-extrabold uppercase text-slate-900 border-b pb-1 text-center font-sans tracking-wide">
                                RE: FORMAL DEMAND NOTICE FOR OVERDUE LOAN REPAYMENT - {loan.loanNumber}
                              </h5>
                              <p>
                                We reference the credit facility agreement **{loan.loanNumber}** issued to you on **{loan.disbursedAt ? new Date(loan.disbursedAt).toLocaleDateString() : ""}** of principal amount **KES {loan.amountRequested.toLocaleString()}**.
                              </p>
                              <p>
                                According to our records, this loan reached its scheduled final maturity date on **{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : ""}** and payment has not been received in full. Your account has now remained in severe default for over four (4) days, and is classified as **Defaulted**.
                              </p>
                              <p className="font-bold">
                                As of today, your outstanding balance stands at KES {loan.outstandingBalance.toLocaleString()} (inclusive of a 12% legal default penalty of KES {loan.penaltyAmount.toLocaleString()}).
                              </p>
                              <p>
                                TAKE NOTICE that you are hereby required to pay the full outstanding balance of **KES {loan.outstandingBalance.toLocaleString()}** within forty-eight (48) hours from the date of this notice, failing which AMROW Capital Ltd will institute recovery proceedings, contact your guarantors, and notify the Credit Reference Bureau (CRB) without further reference to you.
                              </p>
                              <div className="pt-6 font-sans flex justify-between items-end border-t mt-4">
                                <div>
                                  <p className="font-bold">Signed,</p>
                                  <p className="font-extrabold text-slate-900 mt-6">Sebastian Kuti</p>
                                  <p className="text-[10px] text-slate-400">Managing Director, AMROW CAPITAL LTD</p>
                                </div>
                                <button
                                  onClick={() => window.print()}
                                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-sans font-bold flex items-center space-x-1.5"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>Print Formal Notice</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Client Uploaded Documents */}
                {activeProfileTab === "documents" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Client Vault & Registry Documents</h3>
                      <button 
                        onClick={() => setIsUploading(!isUploading)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-lg font-bold flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Upload Compliance File</span>
                      </button>
                    </div>

                    {isUploading && (
                      <form onSubmit={handleUploadDocument} className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3.5 text-xs">
                        <h4 className="font-bold text-slate-700">Upload New Compliance Document</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Document Name / Title</label>
                            <input
                              type="text"
                              value={uploadDocName}
                              onChange={(e) => setUploadDocName(e.target.value)}
                              placeholder="e.g. Kakamega Town Business License"
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category Classification</label>
                            <select
                              value={uploadCategory}
                              onChange={(e) => setUploadCategory(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg cursor-pointer"
                            >
                              <option value="Client Registry">Client Registry</option>
                              <option value="Loan Compliance">Loan Compliance</option>
                              <option value="Biometric Clearance">Biometric Clearance</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Audit Details / Notes</label>
                            <input
                              type="text"
                              value={uploadDetails}
                              onChange={(e) => setUploadDetails(e.target.value)}
                              placeholder="Describe the content of this file..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button type="button" onClick={() => setIsUploading(false)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg">Cancel</button>
                          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold">Confirm Upload</button>
                        </div>
                      </form>
                    )}

                    {clientDocs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No compliance files found in this client's registry cabinet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clientDocs.map(doc => (
                          <div key={doc.id} className="border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50/30 transition">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-500 font-bold text-xs uppercase font-mono">
                                PDF
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs">{doc.name}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Size: {doc.size} • Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mt-2 md:mt-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                doc.status === "Verified" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>{doc.status}</span>
                              <button 
                                onClick={() => setSelectedDoc(doc)}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded-lg flex items-center space-x-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Preview Inside LMS</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 8. Client SMS Notifications */}
                {activeProfileTab === "sms" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">M-Pesa & Repayment SMS Logs</h3>
                    </div>

                    {/* Quick custom SMS composer */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Send Custom Compliance Message (PLO/Manager)</h4>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customSmsText}
                          onChange={(e) => setCustomSmsText(e.target.value)}
                          placeholder="Type message to dispatch to client's phone..."
                          className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                        />
                        <button
                          onClick={handleSendCustomSms}
                          disabled={smsSending || !customSmsText.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 disabled:opacity-50 transition shadow-lg shadow-blue-500/10"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{smsSending ? "Sending..." : "Dispatch"}</span>
                        </button>
                      </div>
                    </div>

                    {clientSms.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No SMS dispatches registered under this phone connection.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clientSms.map(sms => (
                          <div key={sms.id} className="border border-slate-100 rounded-2xl p-3 text-xs bg-slate-50/50">
                            <div className="flex justify-between items-center pb-1 border-b border-slate-100/50 mb-1.5">
                              <span className="font-bold text-slate-700">Type: {sms.type} notice</span>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(sms.sentAt).toLocaleString()}</span>
                            </div>
                            <p className="font-mono text-slate-600 leading-relaxed text-[10px]">{sms.message}</p>
                            <span className="text-[9px] text-emerald-600 font-bold inline-block mt-1">✓ Sent Successfully</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 9. Client Audit Logs */}
                {activeProfileTab === "audit" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Client Registry System Audit Trail</h3>
                    </div>

                    {clientLogs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No core system audits registered under this client key.
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                        {clientLogs.map(log => (
                          <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between text-slate-400 font-bold text-[9px] uppercase">
                              <span>Action: {log.action}</span>
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-800 font-semibold mt-1">{log.details}</p>
                            <p className="text-[10px] text-slate-500 mt-1">By: {log.userFullName} ({log.userRole})</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ======================================= */}
            {/* ======= EMPLOYEE TAB PANELS CONTENT ===== */}
            {/* ======================================= */}
            {!isClient && activeStaff && (
              <>
                {/* 1. Staff Personal Info */}
                {activeProfileTab === "personal" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Employee Personal Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Legal Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editStaffForm.fullName || ""}
                            onChange={(e) => setEditStaffForm({ ...editStaffForm, fullName: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeStaff.fullName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Email Address</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editStaffForm.email || ""}
                            onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeStaff.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mobile Phone Number</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editStaffForm.phoneNumber || ""}
                            onChange={(e) => setEditStaffForm({ ...editStaffForm, phoneNumber: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeStaff.phoneNumber || "Not Specified"}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">HR Verification State</label>
                        <div className="bg-slate-50 p-2.5 rounded-xl flex items-center space-x-1.5 text-xs text-slate-800 font-bold">
                          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                          <span>{activeStaff.verificationStatus || "Pending HR Verification"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Staff Employment details */}
                {activeProfileTab === "employment" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Corporate Employment & Clearances</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Core System Role</label>
                        <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">{activeStaff.role}</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IT Clearance Approval Status</label>
                        <p className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-center space-x-1.5">
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                          <span>{activeStaff.itApprovalStatus || "Approved"}</span>
                        </p>
                      </div>

                      <div className="md:col-span-2 pt-4 border-t border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Role Permissions Matrix</label>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <div className="grid grid-cols-3 bg-slate-50 p-2.5 font-bold text-slate-500 font-mono uppercase text-[9px] border-b">
                            <span>Feature Scope</span>
                            <span>Access Rule</span>
                            <span>Action Limit</span>
                          </div>
                          {[
                            { scope: "Client Profiles", rule: "Read/Write permitted", limit: "Assigned County Only" },
                            { scope: "Loan Disbursement", rule: "Dual appraisal required", limit: "KES " + (activeStaff.portfolioDisbursementLimit || 100000).toLocaleString() },
                            { scope: "Waivers & Adjustments", rule: activeStaff.role === UserRole.MD || activeStaff.role === UserRole.FINANCE ? "Authorized" : "Unauthorized", limit: activeStaff.role === UserRole.MD ? "Unlimited write-off" : "View-only" }
                          ].map((row, idx) => (
                            <div key={idx} className="grid grid-cols-3 p-2.5 border-b last:border-0 font-medium">
                              <span className="font-bold text-slate-800">{row.scope}</span>
                              <span className="text-slate-600">{row.rule}</span>
                              <span className="text-slate-500 font-mono">{row.limit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Staff Department & Branch */}
                {activeProfileTab === "department" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">HQ Department & Branch Placement</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Operational Branch</label>
                        <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">
                          {state.branches.find(b => b.id === activeStaff.branchId)?.name || "Kakamega Main HQ Office"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Branch System Code</label>
                        <p className="font-mono font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">
                          {state.branches.find(b => b.id === activeStaff.branchId)?.code || "AMR-KKG-01"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Active Jurisdiction Area</label>
                        <p className="font-bold text-blue-700 bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                          Kakamega County Zones Only
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dual-Control Vault Lock Access</label>
                        <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl">
                          Secured via local biometric backup keys.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Staff Performance Metrics */}
                {activeProfileTab === "performance" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Operational Performance Dashboard (KPIs)</h3>
                    </div>

                    {activeStaff.role !== UserRole.LOAN_OFFICER ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        This employee operates in an Administrative/Management capacity. Standard loan officer performance KPIs are not applicable.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="border border-slate-200 p-4 rounded-2xl">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Portfolio Assigned</span>
                            <span className="text-xs font-bold text-slate-800 block mt-1">{activeStaff.portfolioDetails || "Unassigned"}</span>
                          </div>
                          <div className="border border-slate-200 p-4 rounded-2xl">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Client Count</span>
                            <span className="text-lg font-mono font-extrabold text-slate-900 block mt-0.5">{activeStaff.portfolioTargetClients || 0}</span>
                          </div>
                          <div className="border border-slate-200 p-4 rounded-2xl">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Collection Rate</span>
                            <span className="text-lg font-mono font-extrabold text-slate-900 block mt-0.5">{activeStaff.portfolioTargetCollectionPercent || 90}%</span>
                          </div>
                        </div>

                        {/* Calculations */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-600">Active Handled Clients:</span>
                            <span className="font-bold text-slate-800">{staffPortfolioLoans.length} Clients</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-600">Outstanding Book Balance:</span>
                            <span className="font-mono font-bold text-slate-800">KES {staffPortfolioLoans.reduce((sum, l) => sum + l.outstandingBalance, 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-600">Total Disbursements Handled:</span>
                            <span className="font-mono font-bold text-slate-800">KES {staffPortfolioLoans.reduce((sum, l) => sum + l.amountRequested, 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Staff Payroll Info (Protected) */}
                {activeProfileTab === "payroll" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Private Payroll & Remuneration Slip</h3>
                    </div>

                    {!isHRAuthorized ? (
                      <div className="py-12 text-center bg-rose-50/50 rounded-2xl border border-rose-100">
                        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-rose-800">Access Restricted</h4>
                        <p className="text-[10px] text-rose-600 mt-1 max-w-xs mx-auto">
                          Confidential Payroll ledger is locked for safety. Only authorized HR Managers, IT Officers, and the Managing Director can view employee salary sheets.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/50 space-y-4 text-xs font-sans">
                        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Employee Payroll Ref Number</p>
                            <p className="font-bold text-slate-800 font-mono">AMR-PAY-{activeStaff.id.toUpperCase()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Payment Month</p>
                            <p className="font-bold text-slate-800">July 2026 Payroll Cycle</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between font-semibold text-slate-600">
                            <span>Base Monthly Salary:</span>
                            <span className="font-mono">KES 45,000.00</span>
                          </div>
                          <div className="flex justify-between font-semibold text-slate-600">
                            <span>Branch Allowance:</span>
                            <span className="font-mono">KES 10,000.00</span>
                          </div>
                          <div className="flex justify-between font-semibold text-slate-600">
                            <span>KRA PAYE Tax Deduction:</span>
                            <span className="font-mono text-rose-650">-KES 8,250.00</span>
                          </div>
                          <div className="flex justify-between font-semibold text-slate-600">
                            <span>NSSF Pension Deduction:</span>
                            <span className="font-mono text-rose-650">-KES 400.00</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-800 pt-2 border-t text-sm">
                            <span>Net Salary Payable:</span>
                            <span className="font-mono text-emerald-600">KES 46,350.00</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Staff Uploaded Documents */}
                {activeProfileTab === "documents" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Academic, Contract & Background Certificates</h3>
                      <button 
                        onClick={() => setIsUploading(!isUploading)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-lg font-bold flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Upload HR Document</span>
                      </button>
                    </div>

                    {isUploading && (
                      <form onSubmit={handleUploadDocument} className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3.5 text-xs">
                        <h4 className="font-bold text-slate-700">Upload New Staff Credential File</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Document Title</label>
                            <input
                              type="text"
                              value={uploadDocName}
                              onChange={(e) => setUploadDocName(e.target.value)}
                              placeholder="e.g. Certified Degree Certificate"
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Classification Category</label>
                            <select
                              value={uploadCategory}
                              onChange={(e) => setUploadCategory(e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg cursor-pointer"
                            >
                              <option value="Staff HR Files">Staff HR Files</option>
                              <option value="Biometric Clearance">Biometric Clearance</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Audit Details / Comments</label>
                            <input
                              type="text"
                              value={uploadDetails}
                              onChange={(e) => setUploadDetails(e.target.value)}
                              placeholder="Describe document purpose..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button type="button" onClick={() => setIsUploading(false)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg">Cancel</button>
                          <button type="submit" className="px-3 py-1 bg-violet-600 text-white rounded-lg font-bold">Confirm Upload</button>
                        </div>
                      </form>
                    )}

                    {staffDocs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No background check files found in this employee's vault.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {staffDocs.map(doc => (
                          <div key={doc.id} className="border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50/30 transition animate-fadeIn">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-500 font-bold text-xs uppercase font-mono">
                                PDF
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs">{doc.name}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Size: {doc.size} • Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mt-2 md:mt-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">{doc.status}</span>
                              <button 
                                onClick={() => setSelectedDoc(doc)}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded-lg flex items-center space-x-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Preview Inside LMS</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Staff Leave Records */}
                {activeProfileTab === "leave" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Leave Allotments & Approvals</h3>
                      <button 
                        onClick={() => setShowLeaveForm(!showLeaveForm)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-lg font-bold flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Request Leave Absence</span>
                      </button>
                    </div>

                    {showLeaveForm && (
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3.5 text-xs text-left">
                        <h4 className="font-bold text-slate-700">Submit Absence Form</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Absence Type</label>
                            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg">
                              <option value="Annual">Annual Resting Leave</option>
                              <option value="Sick Leave">Sick Absence</option>
                              <option value="Maternity/Paternity">Maternity/Paternity Leave</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Absence Duration (Days)</label>
                            <input type="number" value={leaveDays} onChange={(e) => setLeaveDays(parseInt(e.target.value) || 1)} className="w-full p-2 bg-white border border-slate-200 rounded-lg" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Absence Reason</label>
                            <input type="text" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Provide reasoning for HR tracking..." className="w-full p-2 bg-white border border-slate-200 rounded-lg" />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setShowLeaveForm(false)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg">Cancel</button>
                          <button onClick={() => { setShowLeaveForm(false); alert("Request received. Escalated to HR for confirmation."); }} className="px-3 py-1 bg-violet-600 text-white rounded-lg font-bold">Submit Request</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {staffLeaveRecords.map((rec, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-2xl p-4 flex justify-between items-center bg-slate-50/20 text-xs">
                          <div>
                            <h4 className="font-bold text-slate-800">{rec.type} Leave</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Start Date: {rec.startDate} • Reason: {rec.reason}</p>
                          </div>
                          <div className="text-right">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{rec.status}</span>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">{rec.days} Working Days</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Staff Disciplinary Records */}
                {activeProfileTab === "disciplinary" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Compliance, Audits & Reviews</h3>
                      {currentUser?.role === UserRole.HR && (
                        <button 
                          onClick={() => setShowDiscForm(!showDiscForm)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-lg font-bold flex items-center space-x-1"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Compliance Note</span>
                        </button>
                      )}
                    </div>

                    {showDiscForm && (
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3.5 text-xs text-left">
                        <h4 className="font-bold text-slate-700">Add Compliance Review Entry</h4>
                        <div className="space-y-2">
                          <input type="text" placeholder="Title/Review Area" value={discTitle} onChange={(e) => setDiscTitle(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg" />
                          <textarea placeholder="Provide detailed audit and compliance notes..." value={discDetails} onChange={(e) => setDiscDetails(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg h-20" />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setShowDiscForm(false)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg">Cancel</button>
                          <button onClick={() => { setShowDiscForm(false); alert("Compliance Entry Recorded."); }} className="px-3 py-1 bg-violet-600 text-white rounded-lg font-bold">Record Entry</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {staffDisciplinaryRecords.map((rec, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20 text-xs">
                          <div className="flex justify-between items-center pb-1 border-b mb-2">
                            <h4 className="font-bold text-slate-800">{rec.title}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">{rec.date}</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed text-xs">{rec.details}</p>
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 mt-2 inline-block uppercase font-bold">{rec.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. Staff Audit Logs */}
                {activeProfileTab === "audit" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Historical Operational Activity Logs</h3>
                    </div>

                    {staffLogs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No operations or edits have been executed by this employee in the current session.
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-[11px] leading-relaxed text-left">
                        {staffLogs.slice(0, 30).map(log => (
                          <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between text-slate-400 font-bold text-[9px] uppercase">
                              <span>Action: {log.action}</span>
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-800 font-semibold mt-1">{log.details}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </div>
        </div>

      </div>

      {/* ======================================= */}
      {/* ===== INTEGRATED DOCUMENT PREVIEWER ===== */}
      {/* ======================================= */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-left">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 w-full max-w-4xl h-[90vh] flex flex-col animate-scaleUp">
            
            {/* Master Document Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-mono uppercase font-bold">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-bold truncate max-w-md">{selectedDoc.name}</h3>
                  <p className="text-[10px] text-slate-400">
                    Category: {selectedDoc.category} • Uploaded At: {new Date(selectedDoc.uploadedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Document Workspace (Preview + Left-hand Metadata) */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Column: Metadata & Approval Workflows */}
              <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-5 overflow-y-auto shrink-0 flex flex-col justify-between text-xs space-y-4">
                <div className="space-y-4">
                  <div className="pb-3 border-b">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Current Validation Status</span>
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      selectedDoc.status === "Verified" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {selectedDoc.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Compliance Details</span>
                    <p className="text-slate-600 leading-relaxed font-medium bg-white p-2.5 rounded-xl border border-slate-200/50">{selectedDoc.details}</p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Audit Trail & Version</span>
                    <p className="text-[10px] text-slate-500 font-mono">Uploaded By: Kakamega Local Office</p>
                    <p className="text-[10px] text-slate-500 font-mono">Current Version: v1.0.2 (Production)</p>
                  </div>
                </div>

                {/* Workflow Controls - Dual Authorization */}
                <div className="pt-4 border-t space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Validation Actions (PLO/Manager)</span>
                  {selectedDoc.status === "Pending Review" ? (
                    <button
                      onClick={() => handleUpdateDocStatus(selectedDoc.id, "Verified")}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center space-x-1 shadow-lg shadow-emerald-600/10"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve & Verify File</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateDocStatus(selectedDoc.id, "Pending Review")}
                      className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl flex items-center justify-center space-x-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Revert to Pending Review</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => { alert("Simulating PDF download..."); }}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl flex items-center justify-center space-x-1"
                  >
                    <Download className="h-4 w-4 text-slate-400" />
                    <span>Download Original PDF</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Dynamic Simulated PDF Renderer */}
              <div className="flex-1 bg-slate-800 p-6 overflow-auto flex flex-col items-center justify-center relative">
                
                {/* Floating zoom control bar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3 py-1.5 rounded-full flex items-center space-x-3.5 shadow-xl z-20 shrink-0">
                  <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-1 hover:bg-slate-800 rounded">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-mono font-bold select-none">{zoomLevel}%</span>
                  <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="p-1 hover:bg-slate-800 rounded">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>

                {/* Simulated Document Sheet Canvas */}
                <div 
                  className="bg-white p-10 shadow-2xl transition-all duration-150 relative border-2 border-slate-100"
                  style={{ width: `${600 * (zoomLevel / 100)}px`, height: `${840 * (zoomLevel / 100)}px` }}
                >
                  <div className="h-full border-4 border-double border-slate-200 p-8 flex flex-col justify-between font-serif text-slate-800 relative select-none">
                    
                    {/* Simulated background watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                      <Landmark className="w-96 h-96 -rotate-12 text-slate-900" />
                    </div>

                    <div className="space-y-4">
                      {/* Logo header */}
                      <div className="text-center pb-4 border-b">
                        <h4 className="font-extrabold text-lg tracking-widest text-slate-900 font-sans uppercase">AMROW CAPITAL LIMITED</h4>
                        <p className="text-[8px] font-sans text-slate-400 tracking-wider">OFFICIAL REGISTRY COMPLIANCE DOCUMENT</p>
                      </div>

                      <div className="space-y-2 text-[10px] leading-relaxed">
                        <div className="flex justify-between font-sans font-bold border-b pb-1">
                          <span>FILE REFERENCE:</span>
                          <span className="font-mono text-slate-600">{selectedDoc.id.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between font-sans font-bold border-b pb-1">
                          <span>OWNER/OWNER ENTITY:</span>
                          <span>{selectedDoc.ownerName}</span>
                        </div>
                        <div className="flex justify-between font-sans font-bold border-b pb-1">
                          <span>REGISTRY DEPT:</span>
                          <span>Kakamega Compliance & Risk Control</span>
                        </div>
                      </div>

                      {/* Fake body paragraphs based on category */}
                      <div className="space-y-3 pt-4">
                        <p className="text-[10px] font-bold text-slate-900 font-sans uppercase">Abstract & Legal Clearance Clause:</p>
                        <p className="text-[9px] leading-relaxed italic text-slate-500">
                          This file has been successfully scanned, digitally certified, and locked into the AMROW core vault system. It conforms to the statutory guidelines under the Central Bank of Kenya Microfinance Regulations and County Licensing laws of Kakamega County.
                        </p>
                        <p className="text-[9px] leading-relaxed text-slate-600">
                          {selectedDoc.details}
                        </p>
                        <p className="text-[9px] leading-relaxed text-slate-600">
                          The biometric and visual validations of this dossier are fully archived alongside transaction ledgers for real-time compliance audits.
                        </p>
                      </div>
                    </div>

                    {/* Footer stamps */}
                    <div className="border-t pt-4 flex justify-between items-end font-sans">
                      <div>
                        <p className="text-[7px] text-slate-400 font-mono">DIGITAL SIGNATURE SECURED</p>
                        <p className="text-[8px] font-bold text-slate-900 font-mono">AMROW-SECURE-KEY-v4</p>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] border-2 border-dashed border-emerald-500 text-emerald-600 font-bold px-2 py-0.5 rounded rotate-6 inline-block uppercase">
                          {selectedDoc.status === "Verified" ? "VERIFIED & AUDITED" : "PENDING AUDIT"}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
