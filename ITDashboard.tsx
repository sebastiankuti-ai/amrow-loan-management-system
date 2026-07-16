import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { UserRole, Staff, LMSChangeRequest } from "../types.js";
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  Server, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Building,
  UserCheck,
  AlertTriangle,
  Terminal,
  Activity,
  Settings,
  Lock,
  Unlock,
  Smartphone,
  HelpCircle,
  Check
} from "lucide-react";

export const ITDashboard: React.FC = () => {
  const { state, currentUser, updateState, logAction } = useApp();
  const { staff, loanProducts, branches } = state;
  const lmsChangeRequests = state.lmsChangeRequests || [];

  const activeConfig = state.systemConfig || {
    smsGatewayActive: true,
    maintenanceMode: false,
    maxDisbursementLimit: 500000,
    appraisalFeePercent: 2.5,
    autoArrearsDays: 3
  };

  const [proposedSms, setProposedSms] = useState<boolean>(activeConfig.smsGatewayActive);
  const [proposedMaint, setProposedMaint] = useState<boolean>(activeConfig.maintenanceMode);
  const [proposedLimit, setProposedLimit] = useState<number>(activeConfig.maxDisbursementLimit);
  const [proposedFee, setProposedFee] = useState<number>(activeConfig.appraisalFeePercent);
  const [proposedArrears, setProposedArrears] = useState<number>(activeConfig.autoArrearsDays);

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] established secure socket tunnel (Kakamega HQ)",
    "[DB] PostgreSQL database pool loaded - 24/100 active connections",
    "[SECURITY] dual-control authorization engine enabled",
    "[LMS] late payment automatic scanner checking overdue status..."
  ]);

  const [inputLog, setInputLog] = useState("");

  if (!currentUser) return null;

  // Staff awaiting IT Activation (HR must have verified them first)
  const pendingStaff = staff.filter(s => 
    s.itApprovalStatus === "Pending IT Approval" && 
    s.verificationStatus === "HR Verified"
  );

  // Pending LMS policy change requests
  const pendingRequests = lmsChangeRequests.filter(r => r.status === "Pending");

  // Check if there is already a pending request for a configuration key
  const getPendingConfigReq = (key: string) => {
    return lmsChangeRequests.find(r => r.type === "system_config" && r.targetId === key && r.status === "Pending");
  };

  const handleProposeConfig = async (key: string, value: string | number | boolean, label: string) => {
    if (getPendingConfigReq(key)) {
      alert("A change request is already pending MD approval for this configuration.");
      return;
    }

    const newRequest: LMSChangeRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "system_config",
      targetId: key,
      newValue: value,
      requestedBy: currentUser.id,
      requestedByName: currentUser.fullName,
      requestedAt: new Date().toISOString(),
      status: "Pending",
      mdOverrideRequired: true,
      mdOverrideDigitallySigned: false
    };

    const newState = {
      ...state,
      lmsChangeRequests: [newRequest, ...(state.lmsChangeRequests || [])]
    };

    await updateState(newState);
    await logAction("IT Configuration Proposal", `Proposed updating system config "${label}" to "${value}" (MD Override Required)`);
    
    setTerminalLogs(prev => [
      ...prev,
      `[CONFIG] proposed update to "${key}" to "${value}" (queued for Managing Director digital override)`
    ]);

    alert(`Success: Proposed update to "${label}" has been submitted. It requires Managing Director Digital Signature Override to take effect.`);
  };

  // Activate staff credential
  const handleActivateStaff = async (staffId: string) => {
    const sToUpdate = staff.find(s => s.id === staffId);
    if (!sToUpdate) return;

    const updatedStaff = staff.map(s => {
      if (s.id === staffId) {
        return { ...s, itApprovalStatus: "Approved" as const };
      }
      return s;
    });

    const newState = {
      ...state,
      staff: updatedStaff
    };

    await updateState(newState);
    await logAction("Staff IT Activation", `Approved IT system credentials and activated access for ${sToUpdate.fullName} (${sToUpdate.role})`);
    
    setTerminalLogs(prev => [
      ...prev,
      `[SECURITY] credential provisioning approved for ${sToUpdate.username}`,
      `[SYSTEM] user role "${sToUpdate.role}" successfully linked to Kakamega HQ`
    ]);

    alert(`Success: credentials activated for ${sToUpdate.fullName}. They can now securely log in.`);
  };

  // Reject staff IT Activation
  const handleRejectStaff = async (staffId: string) => {
    const sToUpdate = staff.find(s => s.id === staffId);
    if (!sToUpdate) return;

    const updatedStaff = staff.map(s => {
      if (s.id === staffId) {
        return { ...s, status: "Suspended" as const, itApprovalStatus: "Pending IT Approval" as const };
      }
      return s;
    });

    const newState = {
      ...state,
      staff: updatedStaff
    };

    await updateState(newState);
    await logAction("Staff IT Rejection", `Declined credential activation for ${sToUpdate.fullName} (${sToUpdate.role})`);
    alert(`Staff credential activation was declined.`);
  };

  // Approve Change Request
  const handleApproveRequest = async (reqId: string) => {
    const request = lmsChangeRequests.find(r => r.id === reqId);
    if (!request) return;

    let updatedProducts = [...loanProducts];
    let updatedCounties = state.counties || ["Kakamega"];
    let updatedSystemConfig = state.systemConfig ? { ...state.systemConfig } : {
      smsGatewayActive: true,
      maintenanceMode: false,
      maxDisbursementLimit: 500000,
      appraisalFeePercent: 2.5,
      autoArrearsDays: 3
    };

    if (request.type === "product_interest_rate") {
      updatedProducts = loanProducts.map(p => {
        if (p.id === request.targetId) {
          return { ...p, interestRatePercent: Number(request.newValue) };
        }
        return p;
      });
    } else if (request.type === "county_expansion") {
      if (!updatedCounties.includes(request.newValue as string)) {
        updatedCounties.push(request.newValue as string);
      }
    } else if (request.type === "system_config") {
      const key = request.targetId as keyof typeof updatedSystemConfig;
      if (key === "smsGatewayActive" || key === "maintenanceMode") {
        updatedSystemConfig[key] = request.newValue === true || request.newValue === "true";
      } else {
        updatedSystemConfig[key] = Number(request.newValue);
      }
    }

    const updatedRequests = lmsChangeRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: "Approved" as const,
          approvedBy: currentUser.id,
          approvedAt: new Date().toISOString(),
          mdOverrideDigitallySigned: r.mdOverrideRequired ? true : undefined
        };
      }
      return r;
    });

    const newState = {
      ...state,
      loanProducts: updatedProducts,
      counties: updatedCounties,
      lmsChangeRequests: updatedRequests,
      systemConfig: updatedSystemConfig
    };

    await updateState(newState);
    await logAction("LMS Proposal Approved by IT", `IT approved change proposal ${reqId}: ${request.newValue}`);
    
    setTerminalLogs(prev => [
      ...prev,
      `[CONFIG] system change approved: updated policy parameter to ${request.newValue}`
    ]);

    alert("Policy proposal successfully approved and updated live in system.");
  };

  // Decline Change Request
  const handleRejectRequest = async (reqId: string) => {
    const request = lmsChangeRequests.find(r => r.id === reqId);
    if (!request) return;

    const updatedRequests = lmsChangeRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: "Rejected" as const,
          rejectionReason: "Declined during IT Security Session"
        };
      }
      return r;
    });

    const newState = {
      ...state,
      lmsChangeRequests: updatedRequests
    };

    await updateState(newState);
    await logAction("LMS Proposal Rejected by IT", `IT rejected change proposal ${reqId}`);
    alert("Change request declined.");
  };

  const handleSendTerminalLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLog.trim()) return;
    setTerminalLogs(prev => [...prev, `[USER_SHELL] ${inputLog}`]);
    setInputLog("");
  };

  return (
    <div className="space-y-6">
      {/* IT Header */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Server className="h-6 w-6 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">IT Operations HQ Console</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authorized: <strong className="text-white">Kakamega HQ Main Server</strong> • System-wide Security, Credential Provisioning, and Dual-Control Auditing.
          </p>
        </div>
        <div className="flex space-x-2 font-mono text-[10px] bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
          <span className="flex items-center text-emerald-400">● GATEWAY SECURE</span>
        </div>
      </div>

      {/* Hardware Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3.5 shadow-xs">
          <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
            <Cpu className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">CPU Core Load</p>
            <p className="text-lg font-black font-mono text-slate-800">12.4 %</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3.5 shadow-xs">
          <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Postgres Pool</p>
            <p className="text-lg font-black font-mono text-slate-800">24 / 100</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3.5 shadow-xs">
          <div className="bg-purple-50 p-2.5 rounded-lg text-purple-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">API Gateway</p>
            <p className="text-lg font-black font-mono text-slate-800">100% OK</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3.5 shadow-xs">
          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Kakamega HQ Node</p>
            <p className="text-lg font-black font-mono text-slate-800">HQ Master</p>
          </div>
        </div>
      </div>

      {/* IT System Configurations & MD Override Dashboard Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
                IT System Configurations Console
              </h2>
              <p className="text-[11px] text-slate-500">
                Configure critical LMS core parameters. All changes require Managing Director override signature to go live.
              </p>
            </div>
          </div>
          <span className="text-[9px] bg-rose-50 text-rose-600 font-bold px-2 py-1 rounded border border-rose-100 font-mono flex items-center space-x-1">
            <Lock className="h-3 w-3" />
            <span>MD OVERRIDE MANDATORY</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* SMS Gateway Toggle */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-slate-500" /> SMS API Gateway
                </span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${activeConfig.smsGatewayActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-800"}`}>
                  {activeConfig.smsGatewayActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Enables instant SMS notifications for loan disbursement and default alerts.
              </p>
            </div>
            
            {getPendingConfigReq("smsGatewayActive") ? (
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-[10px] font-mono text-amber-800 flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Pending Overriding Action</p>
                  <p>Proposed: <span className="underline">{getPendingConfigReq("smsGatewayActive")?.newValue ? "Active" : "Inactive"}</span></p>
                  <p className="text-slate-400 mt-0.5">Awaiting MD digital signature</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={String(proposedSms)}
                  onChange={(e) => setProposedSms(e.target.value === "true")}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="true">Enable SMS Gateway</option>
                  <option value="false">Disable SMS Gateway</option>
                </select>
                <button
                  onClick={() => handleProposeConfig("smsGatewayActive", proposedSms, "SMS API Gateway")}
                  disabled={proposedSms === activeConfig.smsGatewayActive}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-[10px] px-3 py-1.5 rounded transition"
                >
                  Propose
                </button>
              </div>
            )}
          </div>

          {/* System Maintenance Mode */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-slate-500" /> Maintenance Mode
                </span>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${activeConfig.maintenanceMode ? "bg-red-100 text-red-800 animate-pulse" : "bg-emerald-100 text-emerald-800"}`}>
                  {activeConfig.maintenanceMode ? "LOCKOUT" : "Normal"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Locks out all transactional operations and read-only flags branch dashboards.
              </p>
            </div>

            {getPendingConfigReq("maintenanceMode") ? (
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-[10px] font-mono text-amber-800 flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Pending Overriding Action</p>
                  <p>Proposed: <span className="underline">{getPendingConfigReq("maintenanceMode")?.newValue ? "LOCKOUT" : "Normal"}</span></p>
                  <p className="text-slate-400 mt-0.5">Awaiting MD digital signature</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={String(proposedMaint)}
                  onChange={(e) => setProposedMaint(e.target.value === "true")}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="false">Normal Operations</option>
                  <option value="true">Enable Maintenance Lockout</option>
                </select>
                <button
                  onClick={() => handleProposeConfig("maintenanceMode", proposedMaint, "Maintenance Mode")}
                  disabled={proposedMaint === activeConfig.maintenanceMode}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-[10px] px-3 py-1.5 rounded transition"
                >
                  Propose
                </button>
              </div>
            )}
          </div>

          {/* Max Single Disbursement Limit */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-slate-500" /> Max Disbursement Limit
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  KES {activeConfig.maxDisbursementLimit.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                The absolute ceiling for a single automated mobile disbursement batch transfer.
              </p>
            </div>

            {getPendingConfigReq("maxDisbursementLimit") ? (
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-[10px] font-mono text-amber-800 flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Pending Overriding Action</p>
                  <p>Proposed: <span className="underline">KES {Number(getPendingConfigReq("maxDisbursementLimit")?.newValue).toLocaleString()}</span></p>
                  <p className="text-slate-400 mt-0.5">Awaiting MD digital signature</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={proposedLimit}
                  onChange={(e) => setProposedLimit(Number(e.target.value))}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="KES"
                />
                <button
                  onClick={() => handleProposeConfig("maxDisbursementLimit", proposedLimit, "Max Disbursement Limit")}
                  disabled={proposedLimit === activeConfig.maxDisbursementLimit || proposedLimit <= 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-[10px] px-3 py-1.5 rounded transition"
                >
                  Propose
                </button>
              </div>
            )}
          </div>

          {/* Appraisal Fee Percentage */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-slate-500" /> Appraisal Fee Rate
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  {activeConfig.appraisalFeePercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Service/Appraisal percentage fee deducted automatically at disbursement step.
              </p>
            </div>

            {getPendingConfigReq("appraisalFeePercent") ? (
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-[10px] font-mono text-amber-800 flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Pending Overriding Action</p>
                  <p>Proposed: <span className="underline">{getPendingConfigReq("appraisalFeePercent")?.newValue}%</span></p>
                  <p className="text-slate-400 mt-0.5">Awaiting MD digital signature</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  step="0.1"
                  value={proposedFee}
                  onChange={(e) => setProposedFee(Number(e.target.value))}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="%"
                />
                <button
                  onClick={() => handleProposeConfig("appraisalFeePercent", proposedFee, "Appraisal Fee Rate")}
                  disabled={proposedFee === activeConfig.appraisalFeePercent || proposedFee < 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-[10px] px-3 py-1.5 rounded transition"
                >
                  Propose
                </button>
              </div>
            )}
          </div>

          {/* Auto Arrears Days */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-slate-500" /> Auto Arrears Threshold
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  {activeConfig.autoArrearsDays} Days
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Number of days past loan due date before the scheduler marks status as "In Arrears".
              </p>
            </div>

            {getPendingConfigReq("autoArrearsDays") ? (
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-[10px] font-mono text-amber-800 flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Pending Overriding Action</p>
                  <p>Proposed: <span className="underline">{getPendingConfigReq("autoArrearsDays")?.newValue} Days</span></p>
                  <p className="text-slate-400 mt-0.5">Awaiting MD digital signature</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={proposedArrears}
                  onChange={(e) => setProposedArrears(Number(e.target.value))}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="Days"
                />
                <button
                  onClick={() => handleProposeConfig("autoArrearsDays", proposedArrears, "Auto Arrears Days")}
                  disabled={proposedArrears === activeConfig.autoArrearsDays || proposedArrears < 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-[10px] px-3 py-1.5 rounded transition"
                >
                  Propose
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IT System Approvals Dashboard Session */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Approval Panel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
                IT & MD System Approvals Hub
              </h2>
            </div>
            <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-100 font-mono">
              ROLE: IT COMPLIANCE
            </span>
          </div>

          {/* Section 1: Staff Onboarding Approvals (Verified by HR but pending IT credential activation) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
                1. HR-Verified Staff Credential Activations ({pendingStaff.length})
              </h3>
              <p className="text-[10px] text-slate-400 font-sans">Requires IT verification & network provisioning</p>
            </div>

            {pendingStaff.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-150 text-xs text-slate-400 italic">
                No verified employees are currently awaiting IT credentials activation.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingStaff.map(s => {
                  const branch = branches.find(b => b.id === s.branchId);
                  return (
                    <div key={s.id} className="p-4 bg-blue-50/50 border border-blue-150 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[8px] uppercase px-1.5 py-0.5 rounded border border-emerald-200">
                            HR Verified
                          </span>
                          <span className="font-bold text-slate-800 text-sm">{s.fullName}</span>
                        </div>
                        <p className="text-slate-500 font-medium">Username: @{s.username} • Role: {s.role}</p>
                        <p className="text-slate-400 text-[10px]">Email: {s.email} | Branch: {branch?.name || "Kakamega HQ"}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleActivateStaff(s.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Approve & Provision</span>
                        </button>
                        <button
                          onClick={() => handleRejectStaff(s.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold border border-rose-200 transition-all cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Policy Configuration Change proposals (IT & MD Dual Approvals) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
              2. Confidential LMS Change Proposals ({pendingRequests.length})
            </h3>

            {pendingRequests.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-150 text-xs text-slate-400 italic">
                No policy configurations are currently pending approval.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const product = loanProducts.find(p => p.id === req.targetId);
                  return (
                    <div key={req.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-100 text-amber-800 font-bold text-[8px] uppercase px-1.5 py-0.5 rounded border border-amber-200">
                            Awaiting System Action
                          </span>
                          <span className="text-slate-400 font-bold text-[10px]">{new Date(req.requestedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          <strong>{req.requestedByName}</strong> proposed{" "}
                          {req.type === "product_interest_rate" ? (
                            <>
                              setting interest rate of <strong>{product?.name || "Product"}</strong> to <strong className="text-blue-600">{req.newValue}%</strong>
                            </>
                          ) : req.type === "county_expansion" ? (
                            <>
                              expanding physical county bounds to <strong className="text-purple-600">{req.newValue}</strong>
                            </>
                          ) : (
                            <>
                              updating system parameter <strong className="text-blue-600 font-mono">{req.targetId}</strong> to <strong className="text-amber-600 font-mono">{String(req.newValue)}</strong>
                            </>
                          )}
                          {req.mdOverrideRequired && (
                            <span className="ml-2 inline-flex items-center space-x-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded px-1.5 py-0.5 text-[9px] font-bold">
                              <Lock className="h-2.5 w-2.5" />
                              <span>MD Override Flag</span>
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {req.mdOverrideRequired ? (
                          <div className="flex items-center space-x-2">
                            <span className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded text-[10px] font-bold">
                              <Lock className="h-3.5 w-3.5" />
                              <span>Awaiting MD Override</span>
                            </span>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="flex items-center space-x-1 px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold border border-slate-300 transition cursor-pointer"
                              title="Withdraw change request"
                            >
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve Proposal</span>
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-xs transition-all cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Real-time System Terminal Logs */}
        <div className="bg-slate-950 text-slate-300 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4 font-mono flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-1.5">
                <Terminal className="h-4 w-4 text-blue-400" />
                <span className="text-[11px] font-bold tracking-wider text-slate-200 uppercase">System Logs & Shell</span>
              </div>
              <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                SECURE TERMINAL
              </span>
            </div>

            <div className="space-y-2 text-[11px] overflow-y-auto max-h-[260px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {terminalLogs.map((log, idx) => (
                <p key={idx} className="leading-relaxed">
                  <span className="text-slate-500">2026-07-15T13:01:40Z</span>{" "}
                  <span className={
                    log.includes("[ERROR]") ? "text-rose-400" :
                    log.includes("[SECURITY]") ? "text-amber-400" :
                    log.includes("[CONFIG]") ? "text-blue-400" :
                    log.includes("[USER_SHELL]") ? "text-purple-400" :
                    "text-emerald-400"
                  }>
                    {log}
                  </span>
                </p>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendTerminalLog} className="pt-3 border-t border-slate-800 flex items-center space-x-2">
            <span className="text-slate-500 text-xs">$</span>
            <input
              type="text"
              placeholder="Execute terminal check or send log..."
              value={inputLog}
              onChange={(e) => setInputLog(e.target.value)}
              className="w-full text-[11px] bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:outline-hidden focus:border-slate-700"
            />
          </form>
        </div>

      </div>
    </div>
  );
};
