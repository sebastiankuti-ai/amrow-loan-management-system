import React, { useState, useEffect } from "react";
import { useApp } from "./AppContext.js";
import { LoanProduct, UserRole, LMSChangeRequest } from "../types.js";
import { 
  Settings, 
  Percent, 
  MapPin, 
  Plus, 
  EyeOff, 
  Check, 
  AlertOctagon, 
  CircleDollarSign,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck
} from "lucide-react";

export const SettingsManagement: React.FC = () => {
  const { state, currentUser, updateState, logAction } = useApp();
  const { loanProducts, branches } = state;

  const [products, setProducts] = useState<LoanProduct[]>(loanProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);

  const counties = state.counties || ["Kakamega"];
  const [newCounty, setNewCounty] = useState("");

  const lmsChangeRequests = state.lmsChangeRequests || [];

  useEffect(() => {
    setProducts(loanProducts);
  }, [loanProducts]);

  if (!currentUser) return null;

  const isMD = currentUser.role === UserRole.MD;
  const isIT = currentUser.role === UserRole.IT;

  if (!isMD && !isIT) {
    return (
      <div className="p-8 bg-white rounded-xl border border-rose-100 text-center text-rose-600 max-w-lg mx-auto">
        <AlertOctagon className="h-12 w-12 mx-auto text-rose-500 mb-3" />
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="text-sm mt-1">Only the Managing Director (MD) or IT Staff hold credentials to view or modify confidential loan configurations or county bounds.</p>
      </div>
    );
  }

  // MD Direct Save Action
  const handleUpdateProductRate = async (productId: string) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return { ...p, interestRatePercent: editRate };
      }
      return p;
    });

    setProducts(updatedProducts);
    
    const newState = {
      ...state,
      loanProducts: updatedProducts
    };

    await updateState(newState);
    await logAction("Confidential Product Update", `Updated confidential interest rate for "${products.find(p => p.id === productId)?.name}" to ${editRate}%`);
    setEditingId(null);
  };

  // IT Propose Change Action
  const handleProposeProductRate = async (productId: string) => {
    const targetProduct = loanProducts.find(p => p.id === productId);
    if (!targetProduct) return;

    const newRequest: LMSChangeRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "product_interest_rate",
      targetId: productId,
      newValue: editRate,
      requestedBy: currentUser.id,
      requestedByName: currentUser.fullName,
      requestedAt: new Date().toISOString(),
      status: "Pending"
    };

    const newState = {
      ...state,
      lmsChangeRequests: [newRequest, ...lmsChangeRequests]
    };

    await updateState(newState);
    await logAction("LMS Change Proposal", `Proposed interest rate change for product "${targetProduct.name}" to ${editRate}%`);
    setEditingId(null);
    alert(`Success: Interest rate change proposal of ${editRate}% for "${targetProduct.name}" has been submitted for MD approval.`);
  };

  // MD Direct County Expansion Action
  const handleAddCountyExpansion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounty || counties.includes(newCounty)) return;

    const updatedCounties = [...counties, newCounty];
    
    const newState = {
      ...state,
      counties: updatedCounties
    };

    await updateState(newState);
    await logAction("County Policy Expansion", `Added County "${newCounty}" to organizational future expansion list`);
    setNewCounty("");
    alert(`Success: "${newCounty} County" registered for future strategic expansion. Active operational bounds remain locked to Kakamega County.`);
  };

  // IT Propose County Expansion Action
  const handleProposeCountyExpansion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounty || counties.includes(newCounty)) return;

    const newRequest: LMSChangeRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "county_expansion",
      targetId: newCounty,
      newValue: newCounty,
      requestedBy: currentUser.id,
      requestedByName: currentUser.fullName,
      requestedAt: new Date().toISOString(),
      status: "Pending"
    };

    const newState = {
      ...state,
      lmsChangeRequests: [newRequest, ...lmsChangeRequests]
    };

    await updateState(newState);
    await logAction("LMS Change Proposal", `Proposed county expansion bounds to include "${newCounty} County"`);
    setNewCounty("");
    alert(`Success: County expansion proposal for "${newCounty}" has been submitted for MD approval.`);
  };

  // MD Approval Handler
  const handleApproveRequest = async (reqId: string) => {
    const request = lmsChangeRequests.find(r => r.id === reqId);
    if (!request) return;

    let updatedProducts = [...loanProducts];
    let updatedCounties = [...counties];
    let updatedSystemConfig = state.systemConfig ? { ...state.systemConfig } : {
      smsGatewayActive: true,
      maintenanceMode: false,
      maxDisbursementLimit: 500000,
      appraisalFeePercent: 2.5,
      autoArrearsDays: 3
    };

    if (request.mdOverrideRequired) {
      const pin = prompt("Enter Managing Director digital signature passcode (1234) to sign this system override:");
      if (pin !== "1234") {
        alert("Action Cancelled: Invalid Managing Director Digital Signature Passcode.");
        return;
      }
    }

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
    setProducts(updatedProducts);

    const targetDesc = request.type === "product_interest_rate" 
      ? `Interest Rate for ${loanProducts.find(p => p.id === request.targetId)?.name} changed to ${request.newValue}%`
      : request.type === "county_expansion"
      ? `County bounds expanded to include ${request.newValue}`
      : `System parameter ${request.targetId} changed to ${request.newValue}`;

    await logAction("LMS Proposal Approved", `Approved change request proposed by ${request.requestedByName}: ${targetDesc}`);
    alert("Change Request approved successfully. Changes are now live on the system!");
  };

  // MD Rejection Handler
  const handleRejectRequest = async (reqId: string, reason: string) => {
    const request = lmsChangeRequests.find(r => r.id === reqId);
    if (!request) return;

    const updatedRequests = lmsChangeRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: "Rejected" as const,
          rejectionReason: reason || "Declined by MD"
        };
      }
      return r;
    });

    const newState = {
      ...state,
      lmsChangeRequests: updatedRequests
    };

    await updateState(newState);
    await logAction("LMS Proposal Rejected", `Rejected change request proposed by ${request.requestedByName} (${request.type})`);
    alert("Change Request was declined.");
  };

  return (
    <div className="space-y-6">
      {/* Settings Title banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">LMS Policy Configurations</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">Configure interest rate guidelines, automatic penalties, and regional operating boundaries.</p>
      </div>

      {/* IT System Proposal / MD Approval Workspace */}
      {(isMD || isIT) && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {isMD ? "LMS System Change Approval Workspace" : "Your System Change Proposals"}
              </h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded font-mono uppercase">
              Compliance Dual-Control
            </span>
          </div>

          {lmsChangeRequests.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No system policy change requests are currently on file.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {lmsChangeRequests.map((req) => {
                const product = loanProducts.find((p) => p.id === req.targetId);
                const isPending = req.status === "Pending";
                return (
                  <div key={req.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          req.status === "Pending" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          req.status === "Approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          {req.status}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(req.requestedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        <strong>{req.requestedByName} (IT)</strong> proposed{" "}
                        {req.type === "product_interest_rate" ? (
                          <>
                            changing interest rate of <strong>{product?.name || "Product"}</strong> to{" "}
                            <span className="text-blue-600 font-bold font-mono">{req.newValue}%</span>
                          </>
                        ) : req.type === "county_expansion" ? (
                          <>
                            adding county expansion <strong>{req.newValue} County</strong>
                          </>
                        ) : (
                          <>
                            modifying system parameter <strong className="text-blue-600 font-mono">{req.targetId}</strong> to{" "}
                            <span className="text-amber-600 font-bold font-mono">{String(req.newValue)}</span>
                          </>
                        )}
                      </p>
                      {req.rejectionReason && (
                        <p className="text-rose-600 text-[10px] font-mono">
                          Rejection Reason: {req.rejectionReason}
                        </p>
                      )}
                      {req.status === "Approved" && (
                        <p className="text-emerald-600 text-[10px] font-mono">
                          Approved live on system.
                        </p>
                      )}
                    </div>

                    {isPending && isMD && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve & Apply</span>
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt("Enter decline reason:") || "";
                            handleRejectRequest(req.id, reason);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] shadow-sm transition-all cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Loan Product Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <CircleDollarSign className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Confidential Credit Products</h3>
            </div>
            <span className="flex items-center space-x-1 text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
              <EyeOff className="h-3 w-3 shrink-0" />
              <span>Internal View Only</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Configure interest rates for the core AMROW CAPITAL credit facilities. These rates are automatically applied during appraisal formulation inside LMS, but are suppressed on client receipts, SMS reminders, or public dashboards.
          </p>

          <div className="divide-y divide-slate-100">
            {products.map(p => (
              <div key={p.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 font-mono uppercase">{p.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{p.description}</p>
                  <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">Duration: {p.termWeeks} week{p.termWeeks > 1 ? "s" : ""}</p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {editingId === p.id && isIT ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={editRate}
                        onChange={(e) => setEditRate(Number(e.target.value))}
                        className="w-16 text-xs bg-slate-50 border border-slate-200 p-1.5 rounded focus:outline-hidden font-bold"
                        min="1"
                        max="100"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                      <button
                        onClick={() => handleProposeProductRate(p.id)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                        title="Submit Proposal for MD Approval"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-lg font-black font-mono text-slate-800">{p.interestRatePercent}%</span>
                        <p className="text-[9px] text-slate-400 font-mono font-bold leading-none">Interest rate</p>
                      </div>
                      {isIT && (
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditRate(p.interestRatePercent);
                          }}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] px-2.5 py-1.5 rounded transition-all cursor-pointer"
                        >
                          Propose Rate Change
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational County Expansion setting & penalties card */}
        <div className="space-y-6">
          
          {/* Default Penalty card */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-850 shadow-md">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Percent className="h-5 w-5 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Late Penalty Bound</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed mt-3">
              If a client fails to repay within <strong>3 days</strong> of their due date, the system automatically incurs:
            </p>

            <div className="my-4 flex items-baseline space-x-1 justify-center">
              <span className="text-3xl font-black font-mono text-amber-500">12%</span>
              <span className="text-xs font-mono text-slate-400">One-Time Charge</span>
            </div>

            <p className="text-[10px] text-slate-500 italic text-center font-mono">
              * Charges apply against total liability balance and record automatically in audit logs and transactions.
            </p>
          </div>

          {/* Regional County Bounds */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-50">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">county bounds policy</h3>
            </div>

            <p className="text-xs text-slate-500">
              AMROW currently restricts physical loan deployments exclusively to <strong>Kakamega County</strong>. Additional counties can be pre-registered here for strategic marketing:
            </p>

            {/* Counties list */}
            <div className="flex flex-wrap gap-1.5 font-mono">
              {counties.map(c => (
                <span 
                  key={c} 
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    c === "Kakamega" 
                      ? "bg-blue-100 text-blue-800 border border-blue-200" 
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  📍 {c} {c === "Kakamega" ? "(ACTIVE)" : "(PLAN)"}
                </span>
              ))}
            </div>

            {/* Expansion form */}
            {isIT ? (
              <form onSubmit={handleProposeCountyExpansion} className="pt-2 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Propose county expansion..."
                  value={newCounty}
                  onChange={(e) => setNewCounty(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-1.5 focus:outline-hidden"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded text-xs font-semibold shrink-0 cursor-pointer"
                  title="Propose County to MD"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="pt-2 text-[10px] text-slate-400 italic font-mono border-t border-slate-50">
                * Policy changes must be proposed by IT staff and approved by the Managing Director.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
