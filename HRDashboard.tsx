import React from "react";
import { useApp } from "./AppContext.js";
import { UserRole, Staff } from "../types.js";
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Building,
  Mail,
  Award
} from "lucide-react";

export const HRDashboard: React.FC = () => {
  const { state, currentUser, updateState, logAction } = useApp();
  const { staff, branches } = state;

  if (!currentUser) return null;

  // Filter unverified staff
  const pendingVerification = staff.filter(s => 
    s.isVerified === false || 
    s.verificationStatus === "Pending HR Verification"
  );

  const activeStaff = staff.filter(s => s.status === "Active" && s.isVerified);
  const suspendedStaff = staff.filter(s => s.status === "Suspended");

  // Verify staff account
  const handleVerifyStaff = async (staffId: string) => {
    const sToUpdate = staff.find(s => s.id === staffId);
    if (!sToUpdate) return;

    const updatedStaff = staff.map(s => {
      if (s.id === staffId) {
        return { 
          ...s, 
          isVerified: true, 
          verificationStatus: "HR Verified" as const,
          itApprovalStatus: "Pending IT Approval" as const // Queue for IT
        };
      }
      return s;
    });

    const newState = {
      ...state,
      staff: updatedStaff
    };

    await updateState(newState);
    await logAction("Staff Verification", `HR Manager Harriet Rose verified employee profile for ${sToUpdate.fullName} (${sToUpdate.role})`);
    alert(`Success: ${sToUpdate.fullName} has been officially VERIFIED by HR. Their profile is now queued in the IT Approval Workspace for credentials activation.`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-xl border border-blue-600 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-blue-200" />
            <h1 className="text-xl font-bold tracking-tight">HR Management Portal</h1>
          </div>
          <p className="text-xs text-blue-100 mt-1">
            Access Authorized: <strong className="text-white">Harriet Rose (HR Manager)</strong> • AMROW Head Office (Kakamega HQ)
          </p>
        </div>
        <span className="bg-blue-600 border border-blue-400 font-mono text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider">
          HQ Onboarding Active
        </span>
      </div>

      {/* HR Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-xs">
          <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Total Personnel</p>
            <p className="text-lg font-black font-mono text-slate-800">{staff.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-xs">
          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Pending HR Verify</p>
            <p className="text-lg font-black font-mono text-slate-800">{pendingVerification.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-xs">
          <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Active & Verified</p>
            <p className="text-lg font-black font-mono text-slate-800">{activeStaff.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-4 shadow-xs">
          <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Suspended Accounts</p>
            <p className="text-lg font-black font-mono text-slate-800">{suspendedStaff.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Verification Board */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
                HR Verification Queue
              </h2>
            </div>
            <p className="text-[10px] text-slate-400">Verify new recruits to authorize IT credential setup</p>
          </div>

          {pendingVerification.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic space-y-2">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto opacity-70 animate-bounce" />
              <p>Excellent! All employee credentials are fully verified and up-to-date.</p>
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              {pendingVerification.map(s => {
                const branch = branches.find(b => b.id === s.branchId);
                return (
                  <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm leading-tight">{s.fullName}</p>
                      <p className="text-slate-500">Username ID: @{s.username} • Corporate Email: {s.email}</p>
                      <p className="text-slate-400 text-[10px] flex items-center space-x-1">
                        <Building className="h-3 w-3 inline" />
                        <span>Branch Assigned: {branch?.name || "Kakamega Headquarters"} | Role: {s.role}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleVerifyStaff(s.id)}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Verify Profile</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HR Context Cards / Fast Track */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-50">
              <Award className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Onboarding Guidelines</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              HR is responsible for the complete dual-control hiring process at AMROW CAPITAL LTD:
            </p>

            <ul className="space-y-2.5 text-[11px] text-slate-600 font-medium">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">1.</span>
                <span><strong>Create staff records</strong> using the Staff Directory tab in the left sidebar.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">2.</span>
                <span><strong>Verify the profile</strong> in this portal to certify compliance bounds.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">3.</span>
                <span><strong>IT Officer activates credentials</strong> on their terminal before the employee can log in.</span>
              </li>
            </ul>

            <div className="pt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-500 flex items-start space-x-1.5">
              <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span>Registered corporate address: Kakamega HQ, Block A, Town Plaza.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
