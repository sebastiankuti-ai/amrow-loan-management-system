import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { Loan, UserRole, LoanProduct } from "../types.js";
import { 
  FilePlus, 
  CircleDollarSign, 
  Clock, 
  Check, 
  X, 
  Undo, 
  CreditCard, 
  FileText, 
  EyeOff, 
  AlertCircle,
  TrendingDown,
  Search
} from "lucide-react";

export const LoanManagement: React.FC = () => {
  const { state, currentUser, updateState, logAction, sendSms, calculateFees } = useApp();
  const { loans, clients, loanProducts, staff, branches } = state;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create Loan Request states
  const [clientId, setClientId] = useState("");
  const [productId, setProductId] = useState(loanProducts[0]?.id || "");
  const [amountRequested, setAmountRequested] = useState<number>(5000);
  const [formOpen, setFormOpen] = useState(false);

  // Record Payment states
  const [paymentLoanId, setPaymentLoanId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState("");

  if (!currentUser) return null;

  const isMD = currentUser.role === UserRole.MD;
  const isHR = currentUser.role === UserRole.HR;
  const isIT = currentUser.role === UserRole.IT;
  const isAccountant = currentUser.role === UserRole.ACCOUNTANT;
  const isPLO = currentUser.role === UserRole.LOAN_OFFICER;
  const isCentralUser = isMD || isHR || isIT;

  // Filter loans list
  const visibleLoans = loans.filter(l => {
    const client = clients.find(c => c.id === l.clientId);
    if (!client) return false;

    // Multi-tenant: BM & staff only see branch loans
    if (!isCentralUser && client.branchId !== currentUser.branchId) return false;
    // PLO sees only assigned client loans
    if (isPLO && client.assignedOfficerId !== currentUser.id) return false;

    // Search filter
    const matchSearch = client.fullName.toLowerCase().includes(search.toLowerCase()) || 
                        client.businessName.toLowerCase().includes(search.toLowerCase()) || 
                        l.loanNumber.includes(search);

    const matchStatus = statusFilter ? l.status === statusFilter : true;

    return matchSearch && matchStatus;
  });

  // Calculate real-time fees during formulation
  const currentProduct = loanProducts.find(p => p.id === productId);
  const feesCalc = calculateFees(amountRequested, productId);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !productId || amountRequested <= 0) return;

    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const termWeeks = currentProduct?.termWeeks || 1;
    const today = new Date();
    
    // Future due date calculation
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + (termWeeks * 7));

    const newLoan: Loan = {
      id: `ln-${Date.now()}`,
      loanNumber: `AMR-LN-2026-${String(loans.length + 1).padStart(4, "0")}`,
      clientId,
      productId,
      amountRequested,
      interestRate: currentProduct?.interestRatePercent || 0,
      interestAmount: feesCalc.interestAmount,
      registrationFee: feesCalc.registrationFee,
      appraisalFee: feesCalc.appraisalFee,
      totalRepayment: feesCalc.totalRepayment,
      outstandingBalance: feesCalc.totalRepayment, // fees are separate or paid upfront
      penaltyAmount: 0,
      appliedPenaltyPercent: 12, // standard penalty rate
      createdAt: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      status: "Pending"
    };

    const newState = {
      ...state,
      loans: [newLoan, ...state.loans]
    };

    await updateState(newState);
    await logAction("Loan Request Formulation", `Formulated loan request ${newLoan.loanNumber} for ${client.fullName} - KES ${amountRequested.toLocaleString()}`);
    
    // Send simulated SMS
    await sendSms(clientId, "Application", newLoan.loanNumber, `KES ${amountRequested.toLocaleString()}`);

    setClientId("");
    setFormOpen(false);
  };

  // Administrative actions
  const handleApproveLoan = async (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const updatedLoans = loans.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: "Approved" as const,
          approvedBy: currentUser.id,
          approvedAt: new Date().toISOString()
        };
      }
      return l;
    });

    const newState = { ...state, loans: updatedLoans };
    await updateState(newState);
    await logAction("Loan Approval", `Approved loan ${loan.loanNumber}`);
    
    // Calculate due date representation
    const termWeeks = loanProducts.find(p => p.id === loan.productId)?.termWeeks || 1;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (termWeeks * 7));
    
    await sendSms(loan.clientId, "Approved", loan.loanNumber, dueDate.toLocaleDateString());
  };

  const handleRejectLoan = async (loanId: string, reason: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const updatedLoans = loans.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: "Rejected" as const,
          rejectedBy: currentUser.id,
          rejectionReason: reason
        };
      }
      return l;
    });

    const newState = { ...state, loans: updatedLoans };
    await updateState(newState);
    await logAction("Loan Rejection", `Rejected loan ${loan.loanNumber} - Reason: ${reason}`);
    await sendSms(loan.clientId, "Rejected", loan.loanNumber, reason);
  };

  const handleReverseApproval = async (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || loan.status !== "Approved") return;

    const updatedLoans = loans.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: "Pending" as const,
          approvedBy: undefined,
          approvedAt: undefined
        };
      }
      return l;
    });

    const newState = { ...state, loans: updatedLoans };
    await updateState(newState);
    await logAction("Loan Approval Reversal", `Reversed approval of loan ${loan.loanNumber} back to Pending`);
  };

  const handleDisburseLoan = async (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const termWeeks = loanProducts.find(p => p.id === loan.productId)?.termWeeks || 1;
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + (termWeeks * 7));

    const updatedLoans = loans.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: "Disbursed" as const,
          disbursedAt: today.toISOString(),
          dueDate: dueDate.toISOString()
        };
      }
      return l;
    });

    // Record Disbursement Transaction
    const newTx = {
      id: `tr-${Date.now()}`,
      loanId,
      clientId: loan.clientId,
      amount: loan.amountRequested,
      type: "Disbursement" as const,
      date: today.toISOString(),
      recordedBy: currentUser.id,
      notes: "System disbursement transfer to registered M-Pesa contact"
    };

    const newState = {
      ...state,
      loans: updatedLoans,
      transactions: [newTx, ...state.transactions]
    };

    await updateState(newState);
    await logAction("Loan Disbursement Release", `Disbursed KES ${loan.amountRequested.toLocaleString()} for loan ${loan.loanNumber}`);
    
    await sendSms(loan.clientId, "Disbursement", dueDate.toLocaleDateString(), `KES ${loan.amountRequested.toLocaleString()}`);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const loan = loans.find(l => l.id === paymentLoanId);
    if (!loan || paymentAmount <= 0) return;

    const today = new Date();
    const remainingBalance = loan.outstandingBalance - paymentAmount;
    const isFullyPaid = remainingBalance <= 0;

    const updatedLoans = loans.map(l => {
      if (l.id === paymentLoanId) {
        return {
          ...l,
          outstandingBalance: Math.max(0, remainingBalance),
          status: isFullyPaid ? ("Fully Repaid" as const) : l.status
        };
      }
      return l;
    });

    // Record Repayment Transaction
    const newTx = {
      id: `tr-${Date.now()}`,
      loanId: paymentLoanId,
      clientId: loan.clientId,
      amount: paymentAmount,
      type: "Repayment" as const,
      date: today.toISOString(),
      recordedBy: currentUser.id,
      notes: paymentNotes || "Over-the-counter local agent recovery payment"
    };

    const newState = {
      ...state,
      loans: updatedLoans,
      transactions: [newTx, ...state.transactions]
    };

    await updateState(newState);
    await logAction("Repayment Journal Entry", `Recorded repayment of KES ${paymentAmount.toLocaleString()} for loan ${loan.loanNumber}`);
    
    await sendSms(loan.clientId, "Payment", loan.loanNumber, `KES ${paymentAmount.toLocaleString()}`);

    if (isFullyPaid) {
      await sendSms(loan.clientId, "Repaid", loan.loanNumber);
    }

    setPaymentLoanId("");
    setPaymentAmount(0);
    setPaymentNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Title blocks */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Credit Portfolio Operations</h1>
          <p className="text-xs text-slate-500">Formulate loan requests, complete credit appraisals, authorize releases, and post recoveries.</p>
        </div>
        <div className="flex items-center space-x-2">
          {!isPLO && (
            <button
              id="btn-open-payment-modal"
              onClick={() => {
                const disp = loans.find(l => l.status === "Disbursed");
                if (disp) {
                  setPaymentLoanId(disp.id);
                  setPaymentAmount(disp.outstandingBalance);
                } else {
                  alert("No active disbursed loans available to repay.");
                }
              }}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 transition-all flex items-center space-x-1"
            >
              <CreditCard className="h-4 w-4" />
              <span>Record Repayment</span>
            </button>
          )}

          <button
            id="btn-toggle-loan-form"
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10"
          >
            <FilePlus className="h-4 w-4" />
            <span>{formOpen ? "Close Appraiser" : "New Loan Request"}</span>
          </button>
        </div>
      </div>

      {/* REPAYMENT RECORDING FORM PANEL */}
      {paymentLoanId && (
        <form onSubmit={handleRecordPayment} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Record Recovery Payment Entry</h3>
            <button type="button" onClick={() => setPaymentLoanId("")} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Select Disbursed Credit Account</label>
              <select
                value={paymentLoanId}
                onChange={(e) => {
                  setPaymentLoanId(e.target.value);
                  const sel = loans.find(l => l.id === e.target.value);
                  if (sel) setPaymentAmount(sel.outstandingBalance);
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
              >
                {loans.filter(l => l.status === "Disbursed").map(l => {
                  const client = clients.find(c => c.id === l.clientId);
                  return (
                    <option key={l.id} value={l.id}>
                      {l.loanNumber} - {client?.fullName} (Outstanding: KES {l.outstandingBalance.toLocaleString()})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Payment Amount Received (KES)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Receipt Memo / Journal Notes</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="M-Pesa transaction code or Bank Ref..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm">
              Post Journal Repayment
            </button>
          </div>
        </form>
      )}

      {/* LOAN APPRASIAL FORM */}
      {formOpen && (
        <form onSubmit={handleCreateLoan} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Loan Appraisal & Underwriting Workspace</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Input Columns */}
            <div className="space-y-4 md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Select Registering Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white cursor-pointer"
                    required
                  >
                    <option value="">Choose partner...</option>
                    {clients.filter(c => isMD ? true : (isPLO ? c.assignedOfficerId === currentUser.id : c.branchId === currentUser.branchId)).map(c => (
                      <option key={c.id} value={c.id}>{c.fullName} ({c.businessName})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Choose Loan Product</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white cursor-pointer"
                  >
                    {loanProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Requested Principal Amount (KES)</label>
                  <input
                    type="number"
                    value={amountRequested}
                    onChange={(e) => setAmountRequested(Number(e.target.value))}
                    step="500"
                    min="1000"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:bg-white"
                    required
                  />
                </div>

              </div>

              {/* Confidentiality Warning banner */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
                <EyeOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Confidentiality Protocol</p>
                  <p className="text-[11px] mt-0.5">Interest rates percentage metrics are business confidential and must NEVER be displayed on client SMS, public screens, or client-facing receipts.</p>
                </div>
              </div>
            </div>

            {/* Live Pricing Breakdown Card */}
            <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-850 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">Live Calculator</span>
                <h4 className="text-sm font-bold mt-1 tracking-tight">Appraisal Pricing Breakdown</h4>
                
                <div className="space-y-2 mt-4 text-xs font-mono">
                  <div className="flex justify-between text-slate-400"><span>Requested Principal:</span><span className="text-white">KES {amountRequested.toLocaleString()}</span></div>
                  
                  {/* Confidential interest visible ONLY inside the LMS during formulation */}
                  <div className="flex justify-between text-slate-400">
                    <span>Confidential Interest ({currentProduct?.interestRatePercent || 0}%):</span>
                    <span className="text-white">KES {feesCalc.interestAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-400"><span>Registration Charge:</span><span className="text-white">KES {feesCalc.registrationFee.toLocaleString()}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Appraisal Charge:</span><span className="text-white">KES {feesCalc.appraisalFee.toLocaleString()}</span></div>
                  
                  <div className="flex justify-between border-t border-slate-850 pt-2 font-bold text-sm">
                    <span className="text-slate-300">Total Liability:</span>
                    <span className="text-blue-400">KES {feesCalc.totalRepayment.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition-all shadow-md shadow-blue-600/10">
                originate loan application
              </button>
            </div>

          </div>
        </form>
      )}

      {/* LOAN DIRECTORY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Filters bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client name, ref number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white text-slate-700 border border-slate-200 rounded-lg px-3 py-2 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="">All Loan Statuses</option>
              <option value="Pending">Pending Appraisal</option>
              <option value="Approved">Approved</option>
              <option value="Disbursed">Disbursed (Active)</option>
              <option value="Rejected">Rejected</option>
              <option value="Fully Repaid">Fully Repaid</option>
            </select>
          </div>
        </div>

        {/* Directory table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                <th className="px-6 py-3.5">Loan Reference / Client</th>
                <th className="px-6 py-3.5 text-right">Principal</th>
                <th className="px-6 py-3.5 text-right">Total Liability</th>
                <th className="px-6 py-3.5 text-right">Outstanding</th>
                <th className="px-6 py-3.5">Term Due</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Appraisal Workflow Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleLoans.map(loan => {
                const client = clients.find(c => c.id === loan.clientId);
                const isOverdue = loan.status === "Disbursed" && new Date(loan.dueDate) < new Date("2026-07-15T11:42:00Z");
                return (
                  <tr key={loan.id} className="hover:bg-slate-55/30 transition-all">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-slate-800">{loan.loanNumber}</p>
                      <p className="font-semibold text-slate-600 mt-0.5">{client?.fullName}</p>
                      <p className="text-[10px] text-slate-400">{client?.businessName}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-600">
                      KES {loan.amountRequested.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600">
                      KES {(loan.totalRepayment + loan.penaltyAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {loan.outstandingBalance > 0 ? (
                        <div>
                          <p className={`font-mono font-bold ${isOverdue ? "text-rose-600" : "text-amber-600"}`}>
                            KES {loan.outstandingBalance.toLocaleString()}
                          </p>
                          {loan.penaltyAmount > 0 && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded font-bold">
                              Includes 12% Late Penalty
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {loan.status === "Pending" ? "Awaiting release" : new Date(loan.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        loan.status === "Disbursed" ? (isOverdue ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse" : "bg-emerald-50 text-emerald-600") :
                        loan.status === "Fully Repaid" ? "bg-blue-50 text-blue-600" :
                        loan.status === "Approved" ? "bg-indigo-50 text-indigo-600" :
                        loan.status === "Rejected" ? "bg-slate-100 text-slate-500" :
                        "bg-amber-50 text-amber-600"
                      }`}>
                        {loan.status} {isOverdue ? "• Overdue" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        
                        {/* MD Approval actions */}
                        {isMD && loan.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApproveLoan(loan.id)}
                              className="bg-emerald-50 text-emerald-600 p-1.5 rounded hover:bg-emerald-100 transition-all font-semibold flex items-center space-x-1 text-[10px]"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                const r = prompt("Enter Rejection Reason:");
                                if (r) handleRejectLoan(loan.id, r);
                              }}
                              className="bg-rose-50 text-rose-600 p-1.5 rounded hover:bg-rose-100 transition-all font-semibold flex items-center space-x-1 text-[10px]"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* Reverse Approval action (undisbursed) */}
                        {isMD && loan.status === "Approved" && (
                          <button
                            onClick={() => handleReverseApproval(loan.id)}
                            className="bg-slate-100 text-slate-600 p-1.5 rounded hover:bg-slate-200 transition-all font-semibold flex items-center space-x-1 text-[10px]"
                            title="Revert Approved loan back to Pending appraisal"
                          >
                            <Undo className="h-3.5 w-3.5" />
                            <span>Revert</span>
                          </button>
                        )}

                        {/* Disbursement Release controls (Accountant or Manager or MD) */}
                        {!isPLO && loan.status === "Approved" && (
                          <button
                            onClick={() => handleDisburseLoan(loan.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-[10px] font-bold flex items-center space-x-1 shadow-xs"
                          >
                            <CircleDollarSign className="h-3.5 w-3.5" />
                            <span>Release Funds</span>
                          </button>
                        )}

                        {/* Status detail when no actions remain */}
                        {loan.status === "Fully Repaid" && (
                          <span className="text-slate-400 text-[10px] font-bold flex items-center justify-end">
                            <Check className="h-4 w-4 text-blue-500 mr-1" /> Settled Account
                          </span>
                        )}

                        {loan.status === "Rejected" && (
                          <span className="text-slate-400 text-[10px] font-mono italic max-w-[150px] truncate" title={loan.rejectionReason}>
                            Reason: {loan.rejectionReason}
                          </span>
                        )}

                        {loan.status === "Disbursed" && (
                          <button
                            onClick={() => setPaymentLoanId(loan.id)}
                            className="bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold"
                          >
                            Record Recovery
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleLoans.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No loan accounts registered under this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
