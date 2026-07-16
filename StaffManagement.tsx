import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { UserRole, Staff } from "../types.js";
import { 
  UserPlus, 
  UserX, 
  ShieldAlert, 
  Check, 
  X, 
  Search, 
  RotateCcw, 
  Building,
  UserCheck,
  Briefcase,
  Trash2
} from "lucide-react";

export const StaffManagement: React.FC = () => {
  const { state, currentUser, updateState, logAction, navigateTo } = useApp();
  const { staff, branches } = state;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  // Create Staff Form states
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.LOAN_OFFICER);
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [formOpen, setFormOpen] = useState(false);
  const [makePublic, setMakePublic] = useState(true);

  // Portfolio Drawer/Modal states (MD Only)
  const [selectedPlo, setSelectedPlo] = useState<Staff | null>(null);
  const [portfolioDetails, setPortfolioDetails] = useState("");
  const [portfolioTargetClients, setPortfolioTargetClients] = useState(30);
  const [portfolioTargetCollectionPercent, setPortfolioTargetCollectionPercent] = useState(100);
  const [portfolioDisbursementLimit, setPortfolioDisbursementLimit] = useState(500000);

  if (!currentUser || (
    currentUser.role !== UserRole.MD && 
    currentUser.role !== UserRole.BRANCH_MANAGER && 
    currentUser.role !== UserRole.HR &&
    currentUser.role !== UserRole.IT
  )) {
    return (
      <div className="p-8 bg-white rounded-xl border border-rose-100 text-center text-rose-600 max-w-lg mx-auto my-12">
        <ShieldAlert className="h-12 w-12 mx-auto text-rose-500 mb-3" />
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="text-sm mt-1">Only the Managing Director (MD), HR Managers, Branch Managers, or IT Officers hold credentials to view or manage the staff roster.</p>
      </div>
    );
  }

  const isMD = currentUser.role === UserRole.MD;
  const isHR = currentUser.role === UserRole.HR;
  const isIT = currentUser.role === UserRole.IT;
  const canManageStaff = isMD || isHR || isIT;

  // Filter staff list
  // MD, HR, and IT see everyone (Kakamega HQ has central oversight), Branch Manager sees only their branch staff
  const visibleStaff = staff.filter(s => {
    const isCentralUser = isMD || isHR || isIT;
    if (!isCentralUser && s.branchId !== currentUser.branchId) return false;
    
    // Search filter
    const matchSearch = s.fullName.toLowerCase().includes(search.toLowerCase()) || 
                        s.username.toLowerCase().includes(search.toLowerCase()) ||
                        s.email.toLowerCase().includes(search.toLowerCase());
    
    const matchRole = roleFilter ? s.role === roleFilter : true;
    const matchBranch = branchFilter ? s.branchId === branchFilter : true;

    return matchSearch && matchRole && matchBranch;
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !email || !branchId) return;

    // Check username collision
    if (staff.some(s => s.username === username)) {
      alert("Error: Username already exists.");
      return;
    }

    const newStaff: Staff = {
      id: `st-${Date.now()}`,
      username,
      fullName,
      email,
      phoneNumber: phoneNumber || "+254700000000",
      password: password || "123456",
      role,
      branchId,
      status: "Active",
      isVerified: true,
      verificationStatus: "HR Verified",
      itApprovalStatus: "Approved",
      portfolioStatus: "None",
      passwordChanged: false
    };

    const newStaffSms = {
      id: `sms-${Date.now()}-welcome`,
      clientId: newStaff.id,
      clientName: newStaff.fullName,
      phoneNumber: newStaff.phoneNumber || "+254700000000",
      loanRef: "WELCOME",
      message: `[AMROW Gateway] Welcome ${newStaff.fullName}! Your staff account has been created on the AMROW CAPITAL LMS. Username: ${newStaff.username}, Temporary PIN/Password: ${newStaff.password || "123456"}. Please login and update your Access PIN/Password immediately to activate your workspace.`,
      type: "StaffWelcome" as const,
      sentAt: new Date().toISOString()
    };

    const newStaffDocs = [
      {
        id: `doc-${Date.now()}-contract`,
        name: `Employment Contract - ${fullName}.pdf`,
        ownerName: `${fullName} (${role})`,
        ownerType: "Staff" as const,
        category: "Staff HR Files",
        uploadedAt: new Date().toISOString(),
        status: "Verified" as const,
        size: "1.8 MB",
        mimetype: "application/pdf",
        details: `Official employment contract and role assignment terms for ${fullName} (${role}) at AMROW CAPITAL.`
      },
      {
        id: `doc-${Date.now()}-ethics`,
        name: `Ethics & Compliance Agreement - ${fullName}.pdf`,
        ownerName: `${fullName} (${role})`,
        ownerType: "Staff" as const,
        category: "Staff HR Files",
        uploadedAt: new Date().toISOString(),
        status: "Verified" as const,
        size: "1.2 MB",
        mimetype: "application/pdf",
        details: `Ethics and confidentiality compliance agreement signed by ${fullName}.`
      }
    ];

    const newState = {
      ...state,
      staff: [...state.staff, newStaff],
      smsNotifications: [...(state.smsNotifications || []), newStaffSms],
      documents: [...(state.documents || []), ...newStaffDocs]
    };

    await updateState(newState);
    const logDetails = `${currentUser.fullName} (${currentUser.role}) created and fully activated/published staff profile for ${fullName} (${role}) instantly.`;
    await logAction("Staff Onboarding Registration", logDetails);
    
    // Reset Form
    setUsername("");
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setPassword("");
    setFormOpen(false);

    alert(`Success: Employee ${fullName} has been created and ACTIVATED immediately! This account is now active, live, and public for instant login.`);
  };

  const handleVerifyStaff = async (staffId: string) => {
    const sToUpdate = staff.find(s => s.id === staffId);
    if (!sToUpdate) return;

    const updatedStaff = staff.map(s => {
      if (s.id === staffId) {
        return { 
          ...s, 
          isVerified: true, 
          verificationStatus: "HR Verified" as const,
          itApprovalStatus: "Pending IT Approval" as const // Moves to IT approvals session
        };
      }
      return s;
    });

    const newState = {
      ...state,
      staff: updatedStaff
    };

    await updateState(newState);
    await logAction("HR Staff Verification", `Verified identity & contract details for ${sToUpdate.fullName}. Profile forwarded to IT for network activation.`);
    alert(`Success: Verified ${sToUpdate.fullName}! Credentials queue has been forwarded to IT for system activation.`);
  };

  const handleUpdateStatus = async (staffId: string, status: Staff["status"]) => {
    const sToUpdate = staff.find(s => s.id === staffId);
    if (!sToUpdate) return;

    const updatedStaff = staff.map(s => {
      if (s.id === staffId) {
        return { ...s, status };
      }
      return s;
    });

    const newState = {
      ...state,
      staff: updatedStaff
    };

    await updateState(newState);
    await logAction("Staff Status Update", `Updated staff ${sToUpdate.fullName} status to ${status}`);
  };

  const handleResetPassword = async (staffId: string) => {
    const sToUpdate = staff.find(s => s.id === staffId);
    if (!sToUpdate) return;

    await logAction("Password Reset", `Initiated password reset link for ${sToUpdate.fullName} (${sToUpdate.email})`);
    alert(`Success: Password reset link for "${sToUpdate.fullName}" sent to ${sToUpdate.email}`);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (staffId === currentUser.id) {
      alert("Error: You cannot delete your own account.");
      return;
    }
    const sToDelete = staff.find(s => s.id === staffId);
    if (!sToDelete) return;
    
    if (!window.confirm(`Are you absolutely sure you want to delete staff member "${sToDelete.fullName}"? This action is permanent.`)) {
      return;
    }

    const updatedStaff = staff.filter(s => s.id !== staffId);
    const newState = {
      ...state,
      staff: updatedStaff
    };
    await updateState(newState);
    await logAction("Staff Deletion", `Deleted employee account for ${sToDelete.fullName} (${sToDelete.role})`);
    alert(`Success: Employee ${sToDelete.fullName} has been deleted.`);
  };

  const openPortfolioModal = (plo: Staff) => {
    setSelectedPlo(plo);
    setPortfolioDetails(plo.portfolioDetails || `${plo.fullName.split(" ")[0]}'s Mumias Portfolio`);
    setPortfolioTargetClients(plo.portfolioTargetClients || 25);
    setPortfolioTargetCollectionPercent(plo.portfolioTargetCollectionPercent || 100); // Default to 100% target as requested
    setPortfolioDisbursementLimit(plo.portfolioDisbursementLimit || 400000);
  };

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlo) return;

    const updatedStaff = staff.map(s => {
      if (s.id === selectedPlo.id) {
        return {
          ...s,
          portfolioDetails,
          portfolioTargetClients,
          portfolioTargetCollectionPercent,
          portfolioDisbursementLimit,
          portfolioStatus: "MD Approved" as const // MD creates & approves on their system!
        };
      }
      return s;
    });

    const newState = {
      ...state,
      staff: updatedStaff
    };

    await updateState(newState);
    await logAction("Staff Portfolio Config", `MD configured & approved system portfolio for ${selectedPlo.fullName}: ${portfolioDetails}`);
    alert(`Portfolio configuration created and MD-approved successfully for ${selectedPlo.fullName}!`);
    setSelectedPlo(null);
  };

  return (
    <div className="space-y-6">
      {/* Upper Title Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management Directory</h1>
          <p className="text-xs text-slate-500">
            {canManageStaff 
              ? "Register, verify, suspend, delete, or configure employee portfolios and system access bounds (Kakamega HQ)." 
              : `Active team roster for ${branches.find(b => b.id === currentUser.branchId)?.name || "local branch"}.`}
          </p>
        </div>
        {canManageStaff && (
          <button
            id="btn-toggle-staff-form"
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10"
          >
            <UserPlus className="h-4 w-4" />
            <span>{formOpen ? "Close Onboarding Form" : "Add Staff Account"}</span>
          </button>
        )}
      </div>

      {/* Onboarding Register Staff Form (HR, IT, or MD) */}
      {canManageStaff && formOpen && (
        <form onSubmit={handleCreateStaff} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Register New Employee (Onboarding Form)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Username ID</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. plo_mumias_peter"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Full Legal Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Peter Khalwale"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. peter@amrow.co.ke"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Registered Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +254711223344"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Access PIN / Password (Optional)</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Defaults to '123456' if blank"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Organizational Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white cursor-pointer"
              >
                {Object.values(UserRole).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Branch Station</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

          </div>

          {currentUser.role === UserRole.MD && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3">
              <input
                id="checkbox-make-public"
                type="checkbox"
                checked={makePublic}
                onChange={(e) => setMakePublic(e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <label htmlFor="checkbox-make-public" className="text-xs font-bold text-emerald-800 block cursor-pointer">
                  Activate & Provision Instantly (Bypass HR/IT Approval)
                </label>
                <span className="text-[10px] text-emerald-600">
                  As System Owner (MD), checking this option bypasses dual-control verification and makes the staff member active, live, and public for immediate system login.
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              id="btn-submit-staff"
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm"
            >
              {currentUser.role === UserRole.MD && makePublic ? "Create & Activate Account" : "Confirm & Save Profile Draft"}
            </button>
          </div>
        </form>
      )}

      {/* Portfolio Config Modal (MD Only) */}
      {isMD && selectedPlo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSavePortfolio} className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configure Staff Portfolio</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPlo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Set the disbursement limits and KPIs for <strong className="text-slate-800">{selectedPlo.fullName}</strong>. Saving this will automatically approve the portfolio on your system.
            </p>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Portfolio Code Name / Region</label>
                <input
                  type="text"
                  value={portfolioDetails}
                  onChange={(e) => setPortfolioDetails(e.target.value)}
                  placeholder="e.g. Kakamega Central Boda Boda Microloans"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Clients</label>
                  <input
                    type="number"
                    value={portfolioTargetClients}
                    onChange={(e) => setPortfolioTargetClients(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white font-mono"
                    min={1}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Collection Target (%)</label>
                  <input
                    type="number"
                    value={portfolioTargetCollectionPercent}
                    onChange={(e) => setPortfolioTargetCollectionPercent(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white font-mono"
                    min={0}
                    max={100}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Disbursement Limit (KES)</label>
                <input
                  type="number"
                  value={portfolioDisbursementLimit}
                  onChange={(e) => setPortfolioDisbursementLimit(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white font-mono"
                  min={1000}
                  step={1000}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setSelectedPlo(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Save & Approve Portfolio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Directory Board */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Filters bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {canManageStaff && (
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-white text-slate-700 border border-slate-200 rounded-lg px-3 py-2 font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="">All Roles</option>
                {Object.values(UserRole).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

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
            </div>
          )}
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                <th className="px-6 py-3.5">Employee Name</th>
                <th className="px-6 py-3.5">Username</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Branch Station</th>
                <th className="px-6 py-3.5">HR Verification</th>
                <th className="px-6 py-3.5">IT System</th>
                <th className="px-6 py-3.5">Portfolio Access</th>
                <th className="px-6 py-3.5">Status</th>
                {canManageStaff && <th className="px-6 py-3.5 text-right">Administrative Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleStaff.map(s => {
                const branch = branches.find(b => b.id === s.branchId);
                const isPlo = s.role === UserRole.LOAN_OFFICER;
                const hasPortfolio = s.portfolioStatus === "MD Approved";

                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                          {s.fullName.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => navigateTo("staff", "Staff", s.id, s.fullName)}
                            className="font-bold text-slate-800 hover:text-blue-600 transition-colors text-left leading-tight block focus:outline-hidden hover:underline cursor-pointer"
                          >
                            {s.fullName}
                          </button>
                          <p className="text-[10px] text-slate-400 font-mono">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{s.username}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{s.role}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      <span className="flex items-center space-x-1">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>{branch?.name || "Unassigned"}</span>
                      </span>
                    </td>
                    
                    {/* HR Verification Column */}
                    <td className="px-6 py-4 font-mono text-[10px]">
                      {s.isVerified || s.verificationStatus === "HR Verified" ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          Verified
                        </span>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mr-1.5">
                            Pending Verify
                          </span>
                          {canManageStaff && (
                            <button
                              onClick={() => handleVerifyStaff(s.id)}
                              className="px-2 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold hover:bg-blue-700 transition-all cursor-pointer"
                              title="Verify Staff Identity"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* IT Activation Column */}
                    <td className="px-6 py-4 font-mono text-[10px]">
                      {s.itApprovalStatus === "Approved" ? (
                        <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          Provisioned
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          Awaiting IT
                        </span>
                      )}
                    </td>

                    {/* Portfolio Access Column */}
                    <td className="px-6 py-4">
                      {isPlo ? (
                        hasPortfolio ? (
                          <div className="space-y-1">
                            <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[10px] font-mono block w-max">
                              Approved
                            </span>
                            <p className="text-[10px] text-slate-500 font-medium font-sans max-w-[150px] truncate" title={s.portfolioDetails}>
                              {s.portfolioDetails}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-1">
                            <span className="text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-[10px] font-mono block w-max">
                              No Portfolio
                            </span>
                            {isMD && (
                              <button
                                onClick={() => openPortfolioModal(s)}
                                className="text-indigo-600 text-[9px] font-bold hover:underline text-left cursor-pointer"
                              >
                                + Setup Portfolio
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-slate-300 italic font-medium">N/A (Non-PLO)</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === "Active" ? "bg-emerald-50 text-emerald-600" :
                        s.status === "Suspended" ? "bg-amber-50 text-amber-600" :
                        "bg-rose-50 text-rose-600"
                      }`}>
                        {s.status}
                      </span>
                    </td>

                    {canManageStaff && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          {/* Setup Portfolio for PLO (MD Only) */}
                          {isMD && isPlo && (
                            <button
                              onClick={() => openPortfolioModal(s)}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer"
                              title="Configure Portfolio"
                            >
                              <Briefcase className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Active state switch */}
                          {isMD && s.status !== "Active" && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, "Active")}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all cursor-pointer"
                              title="Activate Account"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Suspend State switch */}
                          {isMD && s.status === "Active" && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, "Suspended")}
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all cursor-pointer"
                              title="Suspend Access"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Terminate switch */}
                          {isMD && s.status !== "Terminated" && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, "Terminated")}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all cursor-pointer"
                              title="Terminate Contract"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Reset Creds */}
                          <button
                            onClick={() => handleResetPassword(s.id)}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                            title="Reset Password"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Staff Member (MD, HR, IT) */}
                          {canManageStaff && (
                            <button
                              onClick={() => handleDeleteStaff(s.id)}
                              className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-all cursor-pointer"
                              title="Delete Employee Account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {visibleStaff.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">No matching employee accounts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
