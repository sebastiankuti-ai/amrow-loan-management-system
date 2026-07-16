import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { Client, BUSINESS_CATEGORIES, UserRole } from "../types.js";
import { UserPlus, Search, Phone, Store, MapPin, Building, ChevronDown, Filter, FileText, Camera } from "lucide-react";

export const ClientManagement: React.FC = () => {
  const { state, currentUser, updateState, logAction, navigateTo } = useApp();
  const { clients, staff, branches } = state;

  const [search, setSearch] = useState("");
  const [businessFilter, setBusinessFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  // Create Client Form States
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [county, setCounty] = useState("Kakamega"); // Fixed to active County
  const [branchId, setBranchId] = useState(currentUser?.branchId || branches[0]?.id || "");
  const [assignedOfficerId, setAssignedOfficerId] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_CATEGORIES[0]);
  const [businessName, setBusinessName] = useState("");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Referee and Document state hooks
  const [referee1Name, setReferee1Name] = useState("");
  const [referee1Phone, setReferee1Phone] = useState("");
  const [referee2Name, setReferee2Name] = useState("");
  const [referee2Phone, setReferee2Phone] = useState("");

  const [idCardFile, setIdCardFile] = useState<string>("");
  const [clientPhotoFile, setClientPhotoFile] = useState<string>("");
  const [mpesaStatementFile, setMpesaStatementFile] = useState<string>("");
  const [businessPhotoFile, setBusinessPhotoFile] = useState<string>("");
  const [acrossRoadPhotoFile, setAcrossRoadPhotoFile] = useState<string>("");

  // Edit Client States
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editBusinessType, setEditBusinessType] = useState("");
  const [editPloId, setEditPloId] = useState("");

  if (!currentUser) return null;

  const isMD = currentUser.role === UserRole.MD;
  const isHR = currentUser.role === UserRole.HR;
  const isIT = currentUser.role === UserRole.IT;
  const isPLO = currentUser.role === UserRole.LOAN_OFFICER;
  const isCentralUser = isMD || isHR || isIT;

  // Auto assign default PLO if PLO is registering
  React.useEffect(() => {
    if (isPLO) {
      setAssignedOfficerId(currentUser.id);
    } else {
      const branchPLO = staff.find(s => s.role === UserRole.LOAN_OFFICER && s.branchId === branchId);
      if (branchPLO) setAssignedOfficerId(branchPLO.id);
    }
  }, [branchId, currentUser, isPLO, staff]);

  // Filter clients
  const visibleClients = clients.filter(c => {
    // If not central user and not branch staff, hide
    if (!isCentralUser && c.branchId !== currentUser.branchId) return false;
    // If PLO, show only assigned clients (or let them view all branch clients)
    if (isPLO && c.assignedOfficerId !== currentUser.id) return false;

    // Search filter
    const matchSearch = c.fullName.toLowerCase().includes(search.toLowerCase()) || 
                        c.businessName.toLowerCase().includes(search.toLowerCase()) || 
                        c.idNumber.includes(search) || 
                        c.phoneNumber.includes(search);

    const matchBusiness = businessFilter ? c.businessType === businessFilter : true;
    const matchBranch = branchFilter ? c.branchId === branchFilter : true;

    return matchSearch && matchBusiness && matchBranch;
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !idNumber || !phoneNumber || !businessName || !referee1Name || !referee1Phone) {
      alert("Please fill in all required fields, including Referee 1 details.");
      return;
    }

    // Validate unique ID Number
    if (clients.some(c => c.idNumber === idNumber)) {
      alert("Registration Error: ID Number already registered.");
      return;
    }

    const finalBusinessType = businessType === "Other" && customBusinessType ? customBusinessType : businessType;
    const clientId = `cl-${Date.now()}`;

    // 1. Create client details
    const newClient: Client = {
      id: clientId,
      fullName,
      idNumber,
      phoneNumber,
      county,
      branchId,
      assignedOfficerId: assignedOfficerId || currentUser.id,
      businessType: finalBusinessType,
      businessName,
      registeredAt: new Date().toISOString(),
      status: "Active",
      referee1Name,
      referee1Phone,
      referee2Name: referee2Name || "N/A",
      referee2Phone: referee2Phone || "N/A",
      idCardFile: idCardFile || `National_ID_${idNumber}.pdf`,
      clientPhotoFile: clientPhotoFile || `Photo_${fullName.replace(/\s+/g, "_")}.jpg`,
      mpesaStatementFile: mpesaStatementFile || `Mpesa_Statement_${fullName.replace(/\s+/g, "_")}.pdf`,
      businessPhotoFile: businessPhotoFile || `Business_Premises_${fullName.replace(/\s+/g, "_")}.jpg`,
      acrossRoadPhotoFile: acrossRoadPhotoFile || `Across_Road_View_${fullName.replace(/\s+/g, "_")}.jpg`
    };

    // 2. Welcome SMS Notification
    const newClientSms = {
      id: `sms-${Date.now()}-welcome`,
      clientId: clientId,
      clientName: fullName,
      phoneNumber: phoneNumber,
      loanRef: "WELCOME",
      message: `Dear ${fullName}, welcome to AMROW CAPITAL! Your credit partner profile has been registered successfully. Member Ref No: ${clientId} under business "${businessName}" (${finalBusinessType}). We look forward to fueling your growth! Contact: 0700-AMROW-CAP.`,
      type: "Welcome" as const,
      sentAt: new Date().toISOString()
    };

    // 3. Vault Compliance Documents
    const newClientDocs = [
      {
        id: `doc-${Date.now()}-id`,
        name: idCardFile || `National ID Scan - ${fullName}.pdf`,
        ownerName: fullName,
        ownerType: "Client" as const,
        category: "Client Registry",
        uploadedAt: new Date().toISOString(),
        status: "Pending Review" as const,
        size: "1.4 MB",
        mimetype: "application/pdf",
        details: `Kenyan National ID scan for credit underwriting. Verified ID: ${idNumber}.`
      },
      {
        id: `doc-${Date.now()}-photo`,
        name: clientPhotoFile || `Client Photo - ${fullName}.jpg`,
        ownerName: fullName,
        ownerType: "Client" as const,
        category: "Client Registry",
        uploadedAt: new Date().toISOString(),
        status: "Pending Review" as const,
        size: "780 KB",
        mimetype: "image/jpeg",
        details: `Official biometric photograph of client ${fullName} taken during physical registration.`
      },
      {
        id: `doc-${Date.now()}-mpesa`,
        name: mpesaStatementFile || `M-Pesa Statement - ${fullName}.pdf`,
        ownerName: fullName,
        ownerType: "Client" as const,
        category: "Client Registry",
        uploadedAt: new Date().toISOString(),
        status: "Pending Review" as const,
        size: "2.3 MB",
        mimetype: "application/pdf",
        details: `Certified 3-month M-Pesa financial statement for cashflow capacity analysis.`
      },
      {
        id: `doc-${Date.now()}-bizphoto`,
        name: businessPhotoFile || `Business Premises Photo - ${fullName}.jpg`,
        ownerName: fullName,
        ownerType: "Client" as const,
        category: "Client Registry",
        uploadedAt: new Date().toISOString(),
        status: "Pending Review" as const,
        size: "1.9 MB",
        mimetype: "image/jpeg",
        details: `Physical workspace audit and stock-level photo of "${businessName}" (${finalBusinessType}).`
      },
      {
        id: `doc-${Date.now()}-acrossroad`,
        name: acrossRoadPhotoFile || `Across Road Location Photo - ${fullName}.jpg`,
        ownerName: fullName,
        ownerType: "Client" as const,
        category: "Client Registry",
        uploadedAt: new Date().toISOString(),
        status: "Pending Review" as const,
        size: "2.1 MB",
        mimetype: "image/jpeg",
        details: `Wide-angle perspective across the road showing landmarks to physically pinpoint business location.`
      }
    ];

    const newState = {
      ...state,
      clients: [...state.clients, newClient],
      smsNotifications: [...(state.smsNotifications || []), newClientSms],
      documents: [...(state.documents || []), ...newClientDocs]
    };

    await updateState(newState);
    await logAction("Client Registration", `Registered client "${fullName}" under "${businessName}" with complete KYC uploads and referee context.`);

    // Reset Form
    setFullName("");
    setIdNumber("");
    setPhoneNumber("");
    setBusinessName("");
    setCustomBusinessType("");
    setReferee1Name("");
    setReferee1Phone("");
    setReferee2Name("");
    setReferee2Phone("");
    setIdCardFile("");
    setClientPhotoFile("");
    setMpesaStatementFile("");
    setBusinessPhotoFile("");
    setAcrossRoadPhotoFile("");
    setFormOpen(false);
  };

  const handleSaveClient = async (clientId: string) => {
    if (!editFullName || !editPhoneNumber || !editBusinessName) return;

    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          fullName: editFullName,
          phoneNumber: editPhoneNumber,
          businessName: editBusinessName,
          businessType: editBusinessType,
          assignedOfficerId: editPloId
        };
      }
      return c;
    });

    const newState = {
      ...state,
      clients: updatedClients
    };

    await updateState(newState);
    await logAction("Client Update", `Updated details for client "${editFullName}"`);
    setEditingClientId(null);
  };

  // Find PLOs to assign
  const availablePLOs = staff.filter(s => s.role === UserRole.LOAN_OFFICER && (isMD ? true : s.branchId === branchId));

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Clients Registry</h1>
          <p className="text-xs text-slate-500">
            {isPLO 
              ? "Create and manage your assigned business clients within Kakamega County." 
              : "Complete directory of active AMROW credit partners."}
          </p>
        </div>
        {(isMD || isPLO || currentUser.role === UserRole.BRANCH_MANAGER) && (
          <button
            id="btn-toggle-client-form"
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10"
          >
            <UserPlus className="h-4 w-4" />
            <span>{formOpen ? "Close Form" : "Register Credit Client"}</span>
          </button>
        )}
      </div>

      {/* Registration Form */}
      {formOpen && (
        <form onSubmit={handleCreateClient} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Client Registration Form</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Full Legal Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Wycliffe Musalia"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            {/* National ID */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">National ID / Passport</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. 29485731"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            {/* Phone number */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Mobile Phone (M-Pesa)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            {/* Business Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Business Trading Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Kakamega Modern Groceries"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            {/* County (Active: Kakamega, expandable) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Operation County</label>
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 cursor-not-allowed"
                disabled
              >
                <option value="Kakamega">Kakamega County (Operating Area)</option>
              </select>
            </div>

            {/* Branch (locked to staff branch unless MD) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Branch Office</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!isMD}
                className={`w-full text-xs border border-slate-200 rounded-lg p-2.5 cursor-pointer ${!isMD ? "bg-slate-100 cursor-not-allowed" : "bg-slate-50"}`}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Business Type */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Business Category</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
              >
                {BUSINESS_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Assigned PLO */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Assigned Loan Officer (PLO)</label>
              <select
                value={assignedOfficerId}
                onChange={(e) => setAssignedOfficerId(e.target.value)}
                disabled={isPLO}
                className={`w-full text-xs border border-slate-200 rounded-lg p-2.5 cursor-pointer ${isPLO ? "bg-slate-100 cursor-not-allowed" : "bg-slate-50"}`}
              >
                <option value="">Select PLO...</option>
                {availablePLOs.map(plo => (
                  <option key={plo.id} value={plo.id}>{plo.fullName}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Custom business type if selected "Other" */}
          {businessType === "Other" && (
            <div className="space-y-1 max-w-md">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Specify Business Category</label>
              <input
                type="text"
                value={customBusinessType}
                onChange={(e) => setCustomBusinessType(e.target.value)}
                placeholder="Specify Category..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>
          )}

          {/* Referees & Guarantors */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Referee & Guarantor Verification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Referee 1 */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-3">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Primary Referee (Required)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Full Legal Name</label>
                    <input
                      type="text"
                      value={referee1Name}
                      onChange={(e) => setReferee1Name(e.target.value)}
                      placeholder="e.g. Peter Kenneth"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Mobile Phone Number</label>
                    <input
                      type="tel"
                      value={referee1Phone}
                      onChange={(e) => setReferee1Phone(e.target.value)}
                      placeholder="e.g. 0722000111"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Referee 2 */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Secondary Referee (Optional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Full Legal Name</label>
                    <input
                      type="text"
                      value={referee2Name}
                      onChange={(e) => setReferee2Name(e.target.value)}
                      placeholder="e.g. Martha Karua"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Mobile Phone Number</label>
                    <input
                      type="tel"
                      value={referee2Phone}
                      onChange={(e) => setReferee2Phone(e.target.value)}
                      placeholder="e.g. 0733000222"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KYC Document Uploads Grid */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Mandatory KYC Documents Upload</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Please upload scans for all five required credit folders. Uploaded items automatically transfer to AMROW's Secure compliance vault.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* National ID Scan */}
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-all text-center relative min-h-[140px]">
                <input
                  type="file"
                  id="id-card-upload"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setIdCardFile(file.name);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <FileText className={`h-8 w-8 mb-2 ${idCardFile ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="text-[10px] font-bold text-slate-700 block">National ID Scan</span>
                <span className="text-[9px] text-slate-400 block mt-1">Front/Back PDF or JPG</span>
                {idCardFile ? (
                  <span className="mt-2 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-full">
                    ✓ {idCardFile}
                  </span>
                ) : (
                  <span className="mt-2 text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Upload ID Card
                  </span>
                )}
              </div>

              {/* Photo of the Client */}
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-all text-center relative min-h-[140px]">
                <input
                  type="file"
                  id="client-photo-upload"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setClientPhotoFile(file.name);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Camera className={`h-8 w-8 mb-2 ${clientPhotoFile ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="text-[10px] font-bold text-slate-700 block">Photo of Client</span>
                <span className="text-[9px] text-slate-400 block mt-1">Recent Biometric Image</span>
                {clientPhotoFile ? (
                  <span className="mt-2 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-full">
                    ✓ {clientPhotoFile}
                  </span>
                ) : (
                  <span className="mt-2 text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Upload Photo
                  </span>
                )}
              </div>

              {/* M-Pesa Statement */}
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-all text-center relative min-h-[140px]">
                <input
                  type="file"
                  id="mpesa-statement-upload"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setMpesaStatementFile(file.name);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <FileText className={`h-8 w-8 mb-2 ${mpesaStatementFile ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="text-[10px] font-bold text-slate-700 block">M-Pesa Statement</span>
                <span className="text-[9px] text-slate-400 block mt-1">Certified 3-Month PDF</span>
                {mpesaStatementFile ? (
                  <span className="mt-2 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-full">
                    ✓ {mpesaStatementFile}
                  </span>
                ) : (
                  <span className="mt-2 text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Upload Statement
                  </span>
                )}
              </div>

              {/* Photo of Business */}
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-all text-center relative min-h-[140px]">
                <input
                  type="file"
                  id="business-photo-upload"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setBusinessPhotoFile(file.name);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Store className={`h-8 w-8 mb-2 ${businessPhotoFile ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="text-[10px] font-bold text-slate-700 block">Photo of Business</span>
                <span className="text-[9px] text-slate-400 block mt-1">Audit of Premises/Stock</span>
                {businessPhotoFile ? (
                  <span className="mt-2 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-full">
                    ✓ {businessPhotoFile}
                  </span>
                ) : (
                  <span className="mt-2 text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Upload Business
                  </span>
                )}
              </div>

              {/* Across the Road Photo */}
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-all text-center relative min-h-[140px]">
                <input
                  type="file"
                  id="across-road-photo-upload"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAcrossRoadPhotoFile(file.name);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <MapPin className={`h-8 w-8 mb-2 ${acrossRoadPhotoFile ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="text-[10px] font-bold text-slate-700 block">Across the Road Photo</span>
                <span className="text-[9px] text-slate-400 block mt-1">Landmark Locational view</span>
                {acrossRoadPhotoFile ? (
                  <span className="mt-2 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-full">
                    ✓ {acrossRoadPhotoFile}
                  </span>
                ) : (
                  <span className="mt-2 text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Upload Road View
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="btn-submit-client"
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm"
            >
              Verify & Register Client
            </button>
          </div>
        </form>
      )}

      {/* Directory Grid with Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name, ID, or Business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="text-xs bg-white text-slate-700 border border-slate-200 rounded-lg px-3 py-2 font-medium focus:outline-hidden cursor-pointer max-w-[150px]"
            >
              <option value="">All Categories</option>
              {BUSINESS_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {isMD && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs bg-white text-slate-700 border border-slate-200 rounded-lg px-3 py-2 font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name.split(" ")[0]}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Client Directory Grid (Visual Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-slate-50/50">
          {visibleClients.map(c => {
            const br = branches.find(b => b.id === c.branchId);
            const plo = staff.find(s => s.id === c.assignedOfficerId);
            const canEditClient = currentUser.role !== UserRole.IT;

            if (editingClientId === c.id) {
              return (
                <div 
                  key={c.id} 
                  className="bg-white p-5 rounded-xl border border-blue-400 shadow-md flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono">Edit Partner Details</h4>
                    
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Legal Name</label>
                      <input 
                        type="text" 
                        value={editFullName} 
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-1.5 font-semibold focus:outline-hidden focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Business Trading Name</label>
                      <input 
                        type="text" 
                        value={editBusinessName} 
                        onChange={(e) => setEditBusinessName(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-1.5 font-semibold focus:outline-hidden focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                      <input 
                        type="text" 
                        value={editPhoneNumber} 
                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-1.5 font-semibold focus:outline-hidden focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Category</label>
                      <select 
                        value={editBusinessType} 
                        onChange={(e) => setEditBusinessType(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-1.5 font-semibold focus:outline-hidden cursor-pointer"
                      >
                        {BUSINESS_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Assigned PLO</label>
                      <select 
                        value={editPloId} 
                        onChange={(e) => setEditPloId(e.target.value)}
                        disabled={isPLO}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-1.5 font-semibold focus:outline-hidden cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select PLO...</option>
                        {availablePLOs.map(p => (
                          <option key={p.id} value={p.id}>{p.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleSaveClient(c.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 rounded transition-all cursor-pointer text-center"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingClientId(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 rounded transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                id={`client-card-${c.id}`}
                key={c.id} 
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 rounded-sm uppercase tracking-wider font-mono">
                        {c.businessType}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">{c.fullName}</h4>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Active Business"></span>
                  </div>

                  <div className="text-xs text-slate-500 font-mono space-y-1 pt-1">
                    <p className="flex items-center space-x-1">
                      <Store className="h-3.5 w-3.5 text-slate-400" />
                      <span>{c.businessName}</span>
                    </p>
                    <p className="flex items-center space-x-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{c.phoneNumber}</span>
                    </p>
                    <p className="flex items-center space-x-1">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      <span>{br?.name || "Kakamega"} Office</span>
                    </p>
                  </div>

                  {/* Expandable Accordion for Referees & KYC Files */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setExpandedClientId(expandedClientId === c.id ? null : c.id)}
                      className="w-full flex justify-between items-center text-[10px] font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <span>{expandedClientId === c.id ? "Hide KYC folder" : "View KYC folder & Referees"}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transform transition-transform ${expandedClientId === c.id ? "rotate-180" : ""}`} />
                    </button>

                    {expandedClientId === c.id && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg space-y-3 border border-slate-200/60 text-[10px] text-slate-700 animate-fadeIn">
                        {/* Referees list */}
                        <div className="space-y-1">
                          <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block">Assigned Referees / Contacts</span>
                          <div className="grid grid-cols-2 gap-2 text-[9px]">
                            <div className="bg-white p-1.5 rounded border border-slate-200/50">
                              <p className="font-bold text-slate-600 truncate">{c.referee1Name || "Wycliffe Oparanya Sr."}</p>
                              <p className="text-[8px] text-slate-500">{c.referee1Phone || "0722333444"}</p>
                            </div>
                            <div className="bg-white p-1.5 rounded border border-slate-200/50">
                              <p className="font-bold text-slate-600 truncate">{c.referee2Name || "Timothy Wetangula Sr."}</p>
                              <p className="text-[8px] text-slate-500">{c.referee2Phone || "0733444555"}</p>
                            </div>
                          </div>
                        </div>

                        {/* KYC Files List */}
                        <div className="space-y-1">
                          <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block">Compliance Document Vault</span>
                          <div className="space-y-1 font-mono text-[8px]">
                            <p className="flex justify-between items-center bg-white p-1 rounded border border-slate-200/50">
                              <span className="text-slate-500">ID Scan:</span>
                              <span className="font-bold text-slate-700 truncate max-w-[120px]" title={c.idCardFile || "National ID Card Scan.pdf"}>{c.idCardFile || "National ID Card Scan.pdf"}</span>
                            </p>
                            <p className="flex justify-between items-center bg-white p-1 rounded border border-slate-200/50">
                              <span className="text-slate-500">Client Photo:</span>
                              <span className="font-bold text-slate-700 truncate max-w-[120px]" title={c.clientPhotoFile || "Client Photo.jpg"}>{c.clientPhotoFile || "Client Photo.jpg"}</span>
                            </p>
                            <p className="flex justify-between items-center bg-white p-1 rounded border border-slate-200/50">
                              <span className="text-slate-500">M-Pesa Statement:</span>
                              <span className="font-bold text-slate-700 truncate max-w-[120px]" title={c.mpesaStatementFile || "Mpesa Statement.pdf"}>{c.mpesaStatementFile || "Mpesa Statement.pdf"}</span>
                            </p>
                            <p className="flex justify-between items-center bg-white p-1 rounded border border-slate-200/50">
                              <span className="text-slate-500">Biz Photo:</span>
                              <span className="font-bold text-slate-700 truncate max-w-[120px]" title={c.businessPhotoFile || "Business Premises.jpg"}>{c.businessPhotoFile || "Business Premises.jpg"}</span>
                            </p>
                            <p className="flex justify-between items-center bg-white p-1 rounded border border-slate-200/50">
                              <span className="text-slate-500">Across Road View:</span>
                              <span className="font-bold text-slate-700 truncate max-w-[120px]" title={c.acrossRoadPhotoFile || "Across the Road Photo.jpg"}>{c.acrossRoadPhotoFile || "Across the Road Photo.jpg"}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-[10px]">
                  <button
                    onClick={() => navigateTo("clients", "Client", c.id, c.fullName)}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition"
                  >
                    View Profile
                  </button>
                  <div className="flex items-center space-x-2">
                    {canEditClient && (
                      <button
                        onClick={() => {
                          setEditingClientId(c.id);
                          setEditFullName(c.fullName);
                          setEditBusinessName(c.businessName);
                          setEditPhoneNumber(c.phoneNumber);
                          setEditBusinessType(c.businessType);
                          setEditPloId(c.assignedOfficerId);
                        }}
                        className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer hover:underline mr-1"
                      >
                        Edit Details
                      </button>
                    )}
                    <span className="text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 font-bold truncate max-w-[100px]" title={plo?.fullName}>
                      PLO: {plo?.fullName.split(" ")[0]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {visibleClients.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No matching client records found.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
