import React, { useState } from "react";
import { useApp } from "./AppContext.js";
import { UserRole, Branch, Staff, Client, Loan, VaultDocument, LMSChangeRequest } from "../types.js";
import { 
  Building, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertOctagon, 
  Award, 
  ChevronRight, 
  ChevronDown, 
  FolderSearch, 
  Percent, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Eye,
  Download,
  ShieldCheck,
  Check,
  Search,
  Lock,
  ShieldAlert,
  Smartphone,
  Laptop,
  Server,
  Settings
} from "lucide-react";

export const MDDashboard: React.FC = () => {
  const { state, calculateFees, updateState, logAction, triggerPenaltyChecks, systemDate, setSystemDate } = useApp();
  const { branches, staff, clients, loans, transactions } = state;

  // Active Drilldown State
  const [drillBranch, setDrillBranch] = useState<string>("");
  const [drillStaff, setDrillStaff] = useState<string>("");
  const [drillClient, setDrillClient] = useState<string>("");
  const [drillLoan, setDrillLoan] = useState<string>("");

  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  const [signatures, setSignatures] = useState<{[reqId: string]: string}>({});
  const [sigErrors, setSigErrors] = useState<{[reqId: string]: string}>({});

  const [portfolioBranchFilter, setPortfolioBranchFilter] = useState<string>("");
  const [portfolioPloFilter, setPortfolioPloFilter] = useState<string>("");
  const [portfolioClientSearch, setPortfolioClientSearch] = useState<string>("");
  const [portfolioDueDateFilter, setPortfolioDueDateFilter] = useState<string>("");
  const [portfolioOverdueDaysFilter, setPortfolioOverdueDaysFilter] = useState<string>("");

  const portfolioLoans = loans.filter(l => l.status === "In Arrears" || l.status === "Defaulted");
  const filteredPortfolioLoans = portfolioLoans.map(loan => {
    const client = clients.find(c => c.id === loan.clientId);
    const plo = staff.find(s => s.id === client?.assignedOfficerId);
    
    // Calculate overdue days
    const dueDate = new Date(loan.dueDate || "");
    const sysDateObj = new Date(systemDate);
    const diffTime = sysDateObj.getTime() - dueDate.getTime();
    let overdueDays = Math.floor(diffTime / (1000 * 3600 * 24));
    if (overdueDays <= 0) overdueDays = 1; // at least 1 day since status is In Arrears or Defaulted

    return {
      loan,
      client,
      plo,
      overdueDays
    };
  }).filter(({ loan, client, plo, overdueDays }) => {
    if (portfolioBranchFilter && client?.branchId !== portfolioBranchFilter) return false;
    if (portfolioPloFilter && client?.assignedOfficerId !== portfolioPloFilter) return false;
    if (portfolioClientSearch && !client?.fullName.toLowerCase().includes(portfolioClientSearch.toLowerCase())) return false;
    if (portfolioDueDateFilter) {
      const filterDate = new Date(portfolioDueDateFilter);
      const loanDueDate = new Date(loan.dueDate || "");
      if (filterDate.toDateString() !== loanDueDate.toDateString()) return false;
    }
    if (portfolioOverdueDaysFilter) {
      if (portfolioOverdueDaysFilter === "1" && overdueDays !== 1) return false;
      if (portfolioOverdueDaysFilter === "2" && overdueDays !== 2) return false;
      if (portfolioOverdueDaysFilter === "3" && overdueDays !== 3) return false;
      if (portfolioOverdueDaysFilter === "4+" && overdueDays < 4) return false;
    }
    return true;
  });

  const advanceSystemDate = async (daysToAdvance: number) => {
    setIsProcessingBatch(true);
    setBatchResult(null);
    try {
      const current = new Date(systemDate);
      current.setDate(current.getDate() + daysToAdvance);
      const newDateStr = current.toISOString();
      
      // Save new system date
      await setSystemDate(newDateStr);
      
      // Automatically trigger batch processing for the new date
      const eventCount = await triggerPenaltyChecks(newDateStr);
      
      if (eventCount > 0) {
        setBatchResult(`Successfully advanced clock by ${daysToAdvance} day(s) to ${current.toLocaleDateString()}. Core LMS processor automatically executed: applied daily charges, updated statuses, generated compliance letters, and dispatched sms notifications. (${eventCount} operations executed)`);
      } else {
        setBatchResult(`Successfully advanced clock by ${daysToAdvance} day(s) to ${current.toLocaleDateString()}. All accounts are up-to-date. (0 operations executed)`);
      }
    } catch (e) {
      console.error(e);
      setBatchResult("Error advancing date or executing automatic batch processes.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const runForceBatchCheck = async () => {
    setIsProcessingBatch(true);
    setBatchResult(null);
    try {
      const eventCount = await triggerPenaltyChecks(systemDate);
      if (eventCount > 0) {
        setBatchResult(`Manual Core Batch completed successfully. Executed ${eventCount} operations: applied daily arrears charges, updated loan statuses to Arrears/Defaulted, generated demand letters, and queued staff notifications.`);
      } else {
        setBatchResult("Manual Core Batch check completed. No outstanding arrears or default penalties were due for the current system date.");
      }
    } catch (e) {
      console.error(e);
      setBatchResult("Error running batch checks.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const docList = state.documents || [];
  const [selectedDocTab, setSelectedDocTab] = useState<"all" | "Client" | "Loan" | "Staff">("all");
  const [docSearch, setDocSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);

  const handleVerifyDoc = async (docId: string) => {
    const updatedDocs = docList.map(d => d.id === docId ? { ...d, status: "Verified" as const } : d);
    const newState = {
      ...state,
      documents: updatedDocs
    };
    await updateState(newState);
    await logAction("Document Verification", `Verified compliance document ID ${docId}`);
    if (selectedDoc && selectedDoc.id === docId) {
      setSelectedDoc(prev => prev ? { ...prev, status: "Verified" as const } : null);
    }
    alert("Compliance Verification successful! Document status updated to VERIFIED.");
  };

  const handleSignAndApproveConfig = async (reqId: string) => {
    const enteredPin = signatures[reqId] || "";
    if (enteredPin.trim() !== "1234") {
      setSigErrors(prev => ({ ...prev, [reqId]: "Invalid MD Digital Signature PIN (try '1234')" }));
      return;
    }

    const lmsChangeRequests = state.lmsChangeRequests || [];
    const request = lmsChangeRequests.find(r => r.id === reqId);
    if (!request) return;

    let updatedSystemConfig = state.systemConfig ? { ...state.systemConfig } : {
      smsGatewayActive: true,
      maintenanceMode: false,
      maxDisbursementLimit: 500000,
      appraisalFeePercent: 2.5,
      autoArrearsDays: 3
    };

    const key = request.targetId as keyof typeof updatedSystemConfig;
    if (key === "smsGatewayActive" || key === "maintenanceMode") {
      updatedSystemConfig[key] = request.newValue === true || request.newValue === "true";
    } else {
      updatedSystemConfig[key] = Number(request.newValue);
    }

    const updatedRequests = lmsChangeRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: "Approved" as const,
          approvedBy: "st-md", // MD ID
          approvedAt: new Date().toISOString(),
          mdOverrideDigitallySigned: true
        };
      }
      return r;
    });

    const newState = {
      ...state,
      systemConfig: updatedSystemConfig,
      lmsChangeRequests: updatedRequests
    };

    await updateState(newState);
    await logAction("MD Digital Signature Override", `Digitally signed and approved IT system configuration override for "${request.targetId}" to "${request.newValue}"`);
    
    // Clear signature state
    setSignatures(prev => {
      const copy = { ...prev };
      delete copy[reqId];
      return copy;
    });
    setSigErrors(prev => {
      const copy = { ...prev };
      delete copy[reqId];
      return copy;
    });

    alert("Override Approved: System configuration updated successfully. Digital signature cryptographically stamped into compliance logs!");
  };

  const handleRejectConfigOverride = async (reqId: string) => {
    const lmsChangeRequests = state.lmsChangeRequests || [];
    const request = lmsChangeRequests.find(r => r.id === reqId);
    if (!request) return;

    const reason = prompt("Enter rejection reason:") || "Declined by MD Override Policy";
    const updatedRequests = lmsChangeRequests.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: "Rejected" as const,
          rejectionReason: reason
        };
      }
      return r;
    });

    const newState = {
      ...state,
      lmsChangeRequests: updatedRequests
    };

    await updateState(newState);
    await logAction("MD Override Rejected", `Rejected proposed IT system configuration override for "${request.targetId}"`);
    alert("Change request declined.");
  };

  const filteredDocs = docList.filter(d => {
    const matchTab = selectedDocTab === "all" ? true : d.ownerType === selectedDocTab;
    const matchSearch = d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
                        d.ownerName.toLowerCase().includes(docSearch.toLowerCase()) ||
                        d.category.toLowerCase().includes(docSearch.toLowerCase());
    return matchTab && matchSearch;
  });

  const today = new Date(systemDate);

  // Filter lists based on county (all restricted to Kakamega for now)
  const activeCounty = "Kakamega";

  // Financial Metrics Calculation
  const totalClients = clients.length;
  
  // Total Issued
  const issuedLoans = loans.filter(l => l.status === "Disbursed" || l.status === "In Arrears" || l.status === "Defaulted" || l.status === "Fully Repaid");
  const totalLoansCount = issuedLoans.length;
  const totalVolumeIssued = issuedLoans.reduce((sum, l) => sum + l.amountRequested, 0);

  // Outstanding portfolio
  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  // Collections
  const repaymentTx = transactions.filter(t => t.type === "Repayment");
  const totalCollections = repaymentTx.reduce((sum, t) => sum + t.amount, 0);

  // Arrears (past due date)
  const overdueLoans = loans.filter(l => {
    if (l.status !== "Disbursed" && l.status !== "In Arrears" && l.status !== "Defaulted") return false;
    if (!l.dueDate) return false;
    const dueDate = new Date(l.dueDate);
    return dueDate < today;
  });
  const totalArrears = overdueLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  // PAR % (Portfolio at Risk) = Arrears / Outstanding portfolio * 100
  const parPercent = totalOutstanding > 0 ? (totalArrears / totalOutstanding) * 100 : 0;

  const pendingApprovalsCount = loans.filter(l => l.status === "Pending").length;
  const approvedLoansCount = loans.filter(l => l.status === "Approved").length;

  // Branch Performance Ranking Metrics
  const branchPerformances = branches.map(br => {
    const brClients = clients.filter(c => c.branchId === br.id);
    const brClientsIds = brClients.map(c => c.id);
    const brLoans = loans.filter(l => brClientsIds.includes(l.clientId));
    
    const issued = brLoans.filter(l => l.status === "Disbursed" || l.status === "Fully Repaid");
    const volume = issued.reduce((sum, l) => sum + l.amountRequested, 0);
    const outstanding = brLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
    
    // Repayments for this branch
    const brRepayments = transactions.filter(t => t.type === "Repayment" && brClientsIds.includes(t.clientId));
    const collections = brRepayments.reduce((sum, t) => sum + t.amount, 0);

    // Dormant clients: registered clients who currently have NO active disbursed loan
    const dormantClients = brClients.filter(c => {
      const hasActiveLoan = loans.some(l => l.clientId === c.id && l.status === "Disbursed");
      return !hasActiveLoan;
    });
    const dormantCount = dormantClients.length;

    // Retention Rate: (Active clients / Total clients) * 100
    const activeCount = brClients.length - dormantCount;
    const retentionRate = brClients.length > 0 ? (activeCount / brClients.length) * 100 : 0;

    // Onboarding Rate: Monthly Onboarding Target is 2 clients registered in current month (July 2026)
    const registeredThisMonth = brClients.filter(c => c.registeredAt.startsWith("2026-07")).length;
    const onboardingTarget = 2; // monthly target
    const onboardingRate = (registeredThisMonth / onboardingTarget) * 100;

    // Collection Rate: (Actual Repayments Collected) / (Actual Repayments Collected + Overdue/Arrears) * 100
    const brOverdueLoans = brLoans.filter(l => {
      if (l.status !== "Disbursed") return false;
      const dueDate = new Date(l.dueDate);
      return dueDate < today;
    });
    const brArrears = brOverdueLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
    const collectionRate = (collections + brArrears) > 0 ? (collections / (collections + brArrears)) * 100 : 100;

    return {
      ...br,
      volume,
      outstanding,
      collections,
      clientsCount: brClients.length,
      dormantCount,
      retentionRate,
      onboardingRate,
      collectionRate,
      arrears: brArrears
    };
  }).sort((a, b) => b.collections - a.collections); // Rank by collections

  // Staff Performance Ranking (Loan Officers)
  const staffPerformances = staff.filter(s => s.role === UserRole.LOAN_OFFICER).map(so => {
    const assignedClients = clients.filter(c => c.assignedOfficerId === so.id);
    const assignedClientsIds = assignedClients.map(c => c.id);
    const assignedLoans = loans.filter(l => assignedClientsIds.includes(l.clientId));
    
    const issued = assignedLoans.filter(l => l.status === "Disbursed" || l.status === "Fully Repaid");
    const volume = issued.reduce((sum, l) => sum + l.amountRequested, 0);
    const outstanding = assignedLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

    const repayments = transactions.filter(t => t.type === "Repayment" && assignedClientsIds.includes(t.clientId));
    const collections = repayments.reduce((sum, t) => sum + t.amount, 0);

    // Dormant clients
    const dormantCount = assignedClients.filter(c => {
      const hasActiveLoan = loans.some(l => l.clientId === c.id && l.status === "Disbursed");
      return !hasActiveLoan;
    }).length;

    // Retention Rate %
    const activeCount = assignedClients.length - dormantCount;
    const retentionRate = assignedClients.length > 0 ? (activeCount / assignedClients.length) * 100 : 0;

    // Onboarding Rate % (Target: 1 client registered in current month per officer)
    const registeredThisMonth = assignedClients.filter(c => c.registeredAt.startsWith("2026-07")).length;
    const onboardingTarget = 1;
    const onboardingRate = (registeredThisMonth / onboardingTarget) * 100;

    // Collection Rate % (Target: 100%)
    const officerOverdueLoans = assignedLoans.filter(l => {
      if (l.status !== "Disbursed") return false;
      const dueDate = new Date(l.dueDate);
      return dueDate < today;
    });
    const officerArrears = officerOverdueLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
    const collectionRate = (collections + officerArrears) > 0 ? (collections / (collections + officerArrears)) * 100 : 100;

    return {
      ...so,
      volume,
      outstanding,
      collections,
      clientsCount: assignedClients.length,
      dormantCount,
      retentionRate,
      onboardingRate,
      collectionRate
    };
  }).sort((a, b) => b.collections - a.collections);

  // Chart data helpers
  // Mock monthly collections trend (May, June, July 2026)
  const months = ["May", "Jun", "Jul"];
  const collectionsByMonth = [
    { month: "May", collections: 180000, volume: 220000 },
    { month: "Jun", collections: 245000, volume: 310000 },
    { month: "Jul", collections: totalCollections, volume: totalVolumeIssued }
  ];

  // DRILLDOWN FILTER LOGIC
  const drillBranches = branches;
  const drillStaffList = drillBranch ? staff.filter(s => s.branchId === drillBranch) : [];
  const drillClientsList = drillStaff ? clients.filter(c => c.assignedOfficerId === drillStaff) : [];
  const drillLoansList = drillClient ? loans.filter(l => l.clientId === drillClient) : [];
  const drillSelectedLoan = drillLoan ? loans.find(l => l.id === drillLoan) : null;

  const handleBranchDrill = (bId: string) => {
    setDrillBranch(bId);
    setDrillStaff("");
    setDrillClient("");
    setDrillLoan("");
  };

  const handleStaffDrill = (sId: string) => {
    setDrillStaff(sId);
    setDrillClient("");
    setDrillLoan("");
  };

  const handleClientDrill = (cId: string) => {
    setDrillClient(cId);
    setDrillLoan("");
  };

  const handleLoanDrill = (lId: string) => {
    setDrillLoan(lId);
  };

  // Arrears & Default Management specific metrics
  const activeLoansCount = loans.filter(l => l.status === "Disbursed" || l.status === "In Arrears").length;
  
  const loansDueTodayCount = loans.filter(l => {
    if (l.status !== "Disbursed" && l.status !== "In Arrears") return false;
    if (!l.dueDate) return false;
    const dDate = new Date(l.dueDate);
    const sDate = new Date(systemDate);
    return dDate.getFullYear() === sDate.getFullYear() &&
           dDate.getMonth() === sDate.getMonth() &&
           dDate.getDate() === sDate.getDate();
  }).length;

  const loansInArrearsCount = loans.filter(l => l.status === "In Arrears").length;
  const defaultedLoansCount = loans.filter(l => l.status === "Defaulted").length;

  const totalArrearsCharges = transactions
    .filter(t => t.type === "ArrearsCharge")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDefaultPenalties = transactions
    .filter(t => t.type === "PenaltyCharge")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Upper MD Controls Bar & Clock Manager */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <h1 className="text-xl font-bold tracking-tight">AMROW Core Operations Clock</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simulate loan maturity, daily late charge accruals, and automatic defaulting cycles.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50">
            <div className="px-3 py-1 bg-slate-950/80 rounded-lg text-xs font-mono text-emerald-400 border border-slate-800">
              Active Date: <span className="font-bold">{new Date(systemDate).toLocaleDateString("en-KE", { dateStyle: "long" })}</span>
            </div>
            <button
              id="btn-advance-1d"
              onClick={() => advanceSystemDate(1)}
              disabled={isProcessingBatch}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              Advance 1 Day
            </button>
            <button
              id="btn-advance-3d"
              onClick={() => advanceSystemDate(3)}
              disabled={isProcessingBatch}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              Advance 3 Days
            </button>
            <button
              id="btn-trigger-batch"
              onClick={runForceBatchCheck}
              disabled={isProcessingBatch}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              Force Batch Run
            </button>
          </div>
        </div>

        {batchResult && (
          <div className="p-3 bg-slate-800/50 border border-slate-700 text-slate-200 text-xs rounded-xl flex items-start space-x-2 animate-fadeIn font-sans leading-relaxed">
            <span className="text-emerald-400 font-bold">▶ SYSTEM REPORT:</span>
            <span>{batchResult}</span>
          </div>
        )}

        {/* 6-Column Arrears & Default Management Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Active Book</p>
            <p className="text-base font-bold text-slate-100 font-mono mt-1">{activeLoansCount} Loans</p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Due Today</p>
            <p className={`text-base font-bold font-mono mt-1 ${loansDueTodayCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
              {loansDueTodayCount} Loans
            </p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">In Arrears</p>
            <p className={`text-base font-bold font-mono mt-1 ${loansInArrearsCount > 0 ? 'text-orange-400' : 'text-slate-100'}`}>
              {loansInArrearsCount} Loans
            </p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Defaulted</p>
            <p className={`text-base font-bold font-mono mt-1 ${defaultedLoansCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {defaultedLoansCount} Loans
            </p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Daily Charges</p>
            <p className="text-base font-bold text-amber-500 font-mono mt-1">KES {totalArrearsCharges.toLocaleString()}</p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Default Penalties</p>
            <p className="text-base font-bold text-violet-400 font-mono mt-1">KES {totalDefaultPenalties.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Clients</p>
            <p className="text-xl font-bold text-slate-900">{totalClients}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">County operations</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Disbursed</p>
            <p className="text-xl font-bold text-slate-900">KES {totalVolumeIssued.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-500 font-medium mt-0.5">{totalLoansCount} Credit lines</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Portfolio</p>
            <p className="text-xl font-bold text-slate-900">KES {totalOutstanding.toLocaleString()}</p>
            <p className="text-[11px] text-blue-500 font-medium mt-0.5">Outstanding Principal</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Portfolio at Risk</p>
            <p className="text-xl font-bold text-amber-600">{parPercent.toFixed(1)}%</p>
            <p className="text-[11px] text-amber-500 font-medium mt-0.5">KES {totalArrears.toLocaleString()} Overdue</p>
          </div>
        </div>
      </div>

      {/* Analytics Visualizers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graphical Trend Line (Custom SVG) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Collection & Credit Trends</h3>
              <p className="text-xs text-slate-400 font-mono">Comparing Disbursed vs Collected (KES)</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-1.5"></span>Disbursed</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-1.5"></span>Collections</span>
            </div>
          </div>
          
          {/* Custom Responsive Chart Canvas */}
          <div className="h-48 flex items-end justify-between px-6 pt-4 border-b border-l border-slate-100 font-mono text-[10px] text-slate-400 relative">
            
            {/* Background grids */}
            <div className="absolute left-0 right-0 top-1/4 border-t border-slate-50"></div>
            <div className="absolute left-0 right-0 top-2/4 border-t border-slate-50"></div>
            <div className="absolute left-0 right-0 top-3/4 border-t border-slate-50"></div>

            {collectionsByMonth.map((item, index) => {
              const maxVal = 400000;
              const disHeight = `${Math.min(90, (item.volume / maxVal) * 100)}%`;
              const colHeight = `${Math.min(90, (item.collections / maxVal) * 100)}%`;

              return (
                <div key={index} className="flex flex-col items-center w-1/3 z-10">
                  <div className="flex space-x-2 items-end w-full justify-center h-32">
                    {/* Disbursed Bar */}
                    <div 
                      style={{ height: disHeight }} 
                      className="w-8 bg-blue-500/80 rounded-t-sm transition-all duration-500 hover:bg-blue-600 relative group cursor-pointer"
                    >
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded px-1.5 py-0.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Disbursed: KES {item.volume.toLocaleString()}
                      </div>
                    </div>
                    {/* Collection Bar */}
                    <div 
                      style={{ height: colHeight }} 
                      className="w-8 bg-emerald-500/80 rounded-t-sm transition-all duration-500 hover:bg-emerald-600 relative group cursor-pointer"
                    >
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded px-1.5 py-0.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Collected: KES {item.collections.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="mt-2 text-slate-600 font-bold">{item.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-[10px] text-slate-400 text-center italic">
            * July figures include real-time live data generated inside active branches.
          </div>
        </div>

        {/* Collections Progress Indicator */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Total Yield Breakdown</h3>
            <p className="text-xs text-slate-400">Total volume recovered against outstanding balance.</p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center">
            {/* Custom SVG Circular Progress */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="64" cy="64" r="54" 
                  className="stroke-slate-100" strokeWidth="8" fill="transparent" 
                />
                <circle 
                  cx="64" cy="64" r="54" 
                  className="stroke-emerald-500 transition-all duration-1000" strokeWidth="8" fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - (totalCollections / (totalVolumeIssued || 1)))}`}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-black text-slate-800">
                  {totalVolumeIssued > 0 ? Math.round((totalCollections / totalVolumeIssued) * 100) : 0}%
                </span>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Recovered</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Accumulated Repayments</span>
              <span className="font-bold text-emerald-600 font-mono">KES {totalCollections.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Principal Remaining</span>
              <span className="font-bold text-blue-600 font-mono">KES {totalOutstanding.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rank Leaderboards */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Branch Comparisons */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Branch Performance Rankings & Dormancy Monitor</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold font-mono">
              <span className="flex items-center text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">● Excellent (≥90%)</span>
              <span className="flex items-center text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">● Good (75-89%)</span>
              <span className="flex items-center text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">● Warning (&lt;75%)</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase font-mono">
                  <th className="py-2.5">Branch</th>
                  <th className="py-2.5 text-center">Clients (Total / Dormant)</th>
                  <th className="py-2.5 text-center">Retention %</th>
                  <th className="py-2.5 text-center">Onboarding % (Monthly)</th>
                  <th className="py-2.5 text-center">Collection %</th>
                  <th className="py-2.5 text-right">Disbursed (KES)</th>
                  <th className="py-2.5 text-right">Recovered (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {branchPerformances.map((bp, i) => {
                  const getRangeColor = (val: number) => {
                    if (val >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-100";
                    if (val >= 75) return "text-amber-600 bg-amber-50 border-amber-100";
                    return "text-rose-600 bg-rose-50 border-rose-100 animate-pulse";
                  };

                  return (
                    <tr key={bp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-800">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded mr-2">
                          #{i+1}
                        </span>
                        {bp.name}
                      </td>
                      <td className="py-3 text-center text-slate-600 font-mono font-semibold">
                        {bp.clientsCount} <span className="text-slate-300">/</span> <span className="text-rose-500 bg-rose-50 px-1 py-0.25 rounded font-bold">{bp.dormantCount} Dormant</span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[10px] ${getRangeColor(bp.retentionRate)}`}>
                            {bp.retentionRate.toFixed(0)}%
                          </span>
                          <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${Math.min(100, bp.retentionRate)}%` }} className={`h-full ${bp.retentionRate >= 90 ? "bg-emerald-500" : bp.retentionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[10px] ${getRangeColor(bp.onboardingRate)}`}>
                            {bp.onboardingRate.toFixed(0)}%
                          </span>
                          <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${Math.min(100, bp.onboardingRate)}%` }} className={`h-full ${bp.onboardingRate >= 90 ? "bg-emerald-500" : bp.onboardingRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[10px] ${getRangeColor(bp.collectionRate)}`}>
                            {bp.collectionRate.toFixed(0)}%
                          </span>
                          <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${Math.min(100, bp.collectionRate)}%` }} className={`h-full ${bp.collectionRate >= 90 ? "bg-emerald-500" : bp.collectionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-slate-600 font-mono">KES {bp.volume.toLocaleString()}</td>
                      <td className="py-3 text-right text-emerald-600 font-bold font-mono">KES {bp.collections.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff / PLO Rankings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Award className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Loan Officer (PLO) Performance Rankings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase font-mono">
                  <th className="py-2.5">Officer</th>
                  <th className="py-2.5">Branch</th>
                  <th className="py-2.5 text-center">Clients (Total / Dormant)</th>
                  <th className="py-2.5 text-center">Retention %</th>
                  <th className="py-2.5 text-center">Onboarding % (Monthly)</th>
                  <th className="py-2.5 text-center">Collection %</th>
                  <th className="py-2.5 text-right font-mono">Portfolio Book (KES)</th>
                  <th className="py-2.5 text-right font-mono">Recovered (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {staffPerformances.map((sp, i) => {
                  const br = branches.find(b => b.id === sp.branchId);
                  const getRangeColor = (val: number) => {
                    if (val >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-100";
                    if (val >= 75) return "text-amber-600 bg-amber-50 border-amber-100";
                    return "text-rose-600 bg-rose-50 border-rose-100";
                  };

                  return (
                    <tr key={sp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-800">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded mr-2">
                          #{i+1}
                        </span>
                        {sp.fullName}
                      </td>
                      <td className="py-3 text-slate-500 font-medium">{br?.name.split(" ")[0]}</td>
                      <td className="py-3 text-center text-slate-600 font-mono font-semibold">
                        {sp.clientsCount} <span className="text-slate-300">/</span> <span className="text-rose-500 bg-rose-50 px-1 py-0.25 rounded font-bold">{sp.dormantCount} Dormant</span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[10px] ${getRangeColor(sp.retentionRate)}`}>
                            {sp.retentionRate.toFixed(0)}%
                          </span>
                          <div className="w-14 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${Math.min(100, sp.retentionRate)}%` }} className={`h-full ${sp.retentionRate >= 90 ? "bg-emerald-500" : sp.retentionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[10px] ${getRangeColor(sp.onboardingRate)}`}>
                            {sp.onboardingRate.toFixed(0)}%
                          </span>
                          <div className="w-14 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${Math.min(100, sp.onboardingRate)}%` }} className={`h-full ${sp.onboardingRate >= 90 ? "bg-emerald-500" : sp.onboardingRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[10px] ${getRangeColor(sp.collectionRate)}`}>
                            {sp.collectionRate.toFixed(0)}%
                          </span>
                          <div className="w-14 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${Math.min(100, sp.collectionRate)}%` }} className={`h-full ${sp.collectionRate >= 90 ? "bg-emerald-500" : sp.collectionRate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-slate-600 font-mono">KES {sp.outstanding.toLocaleString()}</td>
                      <td className="py-3 text-right text-emerald-600 font-bold font-mono">KES {sp.collections.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cascade Drilldown Explorer (Company -> Branch -> Staff -> Client -> Loan) */}
      <div id="drilldown-explorer" className="bg-slate-900 text-white rounded-xl border border-slate-800 shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <FolderSearch className="h-5 w-5 text-blue-400" />
          <h3 className="text-base font-bold tracking-tight">Interactive Hierarchy Drilldown</h3>
        </div>

        {/* Drilldown Steps indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          
          {/* Branch Step */}
          <div className="bg-slate-850 p-3 rounded-lg border border-slate-850">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">1. Branch Level</label>
            <select
              value={drillBranch}
              onChange={(e) => handleBranchDrill(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-white"
            >
              <option value="">Select Branch...</option>
              {drillBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Staff Step */}
          <div className="bg-slate-850 p-3 rounded-lg border border-slate-850">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">2. Staff Level (PLO)</label>
            <select
              value={drillStaff}
              onChange={(e) => handleStaffDrill(e.target.value)}
              disabled={!drillBranch}
              className="w-full bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-white disabled:opacity-50"
            >
              <option value="">Select Officer...</option>
              {drillStaffList.map(s => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.role.split(" ")[0]})</option>
              ))}
            </select>
          </div>

          {/* Client Step */}
          <div className="bg-slate-850 p-3 rounded-lg border border-slate-850">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">3. Client Level</label>
            <select
              value={drillClient}
              onChange={(e) => handleClientDrill(e.target.value)}
              disabled={!drillStaff}
              className="w-full bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-white disabled:opacity-50"
            >
              <option value="">Select Client...</option>
              {drillClientsList.map(c => (
                <option key={c.id} value={c.id}>{c.fullName} - {c.businessName}</option>
              ))}
            </select>
          </div>

          {/* Loan Step */}
          <div className="bg-slate-850 p-3 rounded-lg border border-slate-850">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">4. Loan Record</label>
            <select
              value={drillLoan}
              onChange={(e) => handleLoanDrill(e.target.value)}
              disabled={!drillClient}
              className="w-full bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-white disabled:opacity-50"
            >
              <option value="">Select Loan Ref...</option>
              {drillLoansList.map(l => (
                <option key={l.id} value={l.id}>{l.loanNumber} ({l.status})</option>
              ))}
            </select>
          </div>

        </div>

        {/* Drill down result panel */}
        {drillSelectedLoan && (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-700 pb-3">
              <div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold font-mono uppercase px-2 py-0.5 rounded">Selected Record</span>
                <h4 className="text-lg font-bold text-white mt-1">{drillSelectedLoan.loanNumber}</h4>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono uppercase ${
                drillSelectedLoan.status === "Disbursed" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" :
                drillSelectedLoan.status === "Fully Repaid" ? "bg-blue-500/10 text-blue-300 border border-blue-500/20" :
                drillSelectedLoan.status === "Approved" ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20" :
                "bg-amber-500/10 text-amber-300 border border-amber-500/20"
              }`}>
                {drillSelectedLoan.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Client & Product Details</p>
                <div>
                  <p className="text-slate-300">Name: <strong className="text-white">{clients.find(c => c.id === drillSelectedLoan.clientId)?.fullName}</strong></p>
                  <p className="text-slate-300">Business: <strong className="text-white">{clients.find(c => c.id === drillSelectedLoan.clientId)?.businessName}</strong></p>
                  <p className="text-slate-300">County: <strong className="text-white">{clients.find(c => c.id === drillSelectedLoan.clientId)?.county} County</strong></p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Calculated Loan Values</p>
                <div className="font-mono text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-300">Requested Amount:</span><span className="text-white font-bold">KES {drillSelectedLoan.amountRequested.toLocaleString()}</span></div>
                  {/* Note: Interest rates are displayed to staff inside LMS */}
                  <div className="flex justify-between"><span className="text-slate-300">Interest ({drillSelectedLoan.interestRate}%):</span><span className="text-white">KES {drillSelectedLoan.interestAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-300">Registration Fee:</span><span className="text-white">KES {drillSelectedLoan.registrationFee.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-300">Appraisal Fee:</span><span className="text-white">KES {drillSelectedLoan.appraisalFee.toLocaleString()}</span></div>
                  {drillSelectedLoan.penaltyAmount > 0 && (
                    <div className="flex justify-between text-amber-400 font-bold"><span className="text-amber-400">Late Penalty (12%):</span><span>+ KES {drillSelectedLoan.penaltyAmount.toLocaleString()}</span></div>
                  )}
                  <div className="flex justify-between border-t border-slate-700 pt-1 font-bold text-sm"><span className="text-slate-200">Total Liability:</span><span className="text-blue-400">KES {(drillSelectedLoan.totalRepayment + drillSelectedLoan.penaltyAmount).toLocaleString()}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Repayment Status</p>
                <div className="font-mono text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-300">Outstanding Balance:</span><span className="text-amber-500 font-bold">KES {drillSelectedLoan.outstandingBalance.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-300">Due Date:</span><span className="text-white">{new Date(drillSelectedLoan.dueDate).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-300">Assigned PLO:</span><span className="text-white">{staff.find(s => s.id === clients.find(c => c.id === drillSelectedLoan.clientId)?.assignedOfficerId)?.fullName}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Corporate Compliance & Documents Vault (MD-only Access) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Corporate Compliance & Documents Vault</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authorized Managing Director oversight panel. Inspect and verify administrative, client, and loan agreement files.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex space-x-3 text-xs">
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-center">
              <span className="block font-bold text-slate-700">{docList.length}</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase">Total Files</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 text-center">
              <span className="block font-bold text-emerald-700">{docList.filter(d => d.status === "Verified").length}</span>
              <span className="text-[10px] text-emerald-500 font-medium uppercase">Verified</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 text-center">
              <span className="block font-bold text-amber-700">{docList.filter(d => d.status === "Pending Review").length}</span>
              <span className="text-[10px] text-amber-500 font-medium uppercase">Pending</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setSelectedDocTab("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedDocTab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Files ({docList.length})
            </button>
            <button
              onClick={() => setSelectedDocTab("Client")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedDocTab === "Client"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-indigo-600"
              }`}
            >
              Client Documents ({docList.filter(d => d.ownerType === "Client").length})
            </button>
            <button
              onClick={() => setSelectedDocTab("Loan")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedDocTab === "Loan"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              Loan Agreements ({docList.filter(d => d.ownerType === "Loan").length})
            </button>
            <button
              onClick={() => setSelectedDocTab("Staff")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedDocTab === "Staff"
                  ? "bg-white text-emerald-600 shadow-xs"
                  : "text-slate-500 hover:text-emerald-600"
              }`}
            >
              Staff HR Records ({docList.filter(d => d.ownerType === "Staff").length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Search by file, owner or category..."
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Files Table List */}
        <div className="border border-slate-100 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3">File Title / Name</th>
                <th className="p-3">Associated Profile</th>
                <th className="p-3">Category</th>
                <th className="p-3">Size / Type</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{doc.name}</p>
                          <p className="text-[10px] text-slate-400">Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-slate-700">{doc.ownerName}</p>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-sm font-semibold font-mono uppercase mt-0.5 ${
                          doc.ownerType === "Client" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                          doc.ownerType === "Loan" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}>
                          {doc.ownerType}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-slate-500 font-medium">{doc.category}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-slate-500 text-[11px]">
                        <p>{doc.size}</p>
                        <p className="text-[9px] text-slate-400">PDF Document</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        doc.status === "Verified"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          doc.status === "Verified" ? "bg-emerald-500" : "bg-amber-500"
                        }`}></span>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="View Document Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            alert(`File download initiated: ${doc.name} (${doc.size}) downloaded successfully onto MD terminal.`);
                          }}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Download Compliance File"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {doc.status !== "Verified" && (
                          <button
                            onClick={() => handleVerifyDoc(doc.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all border border-emerald-100"
                            title="Verify and Approve Compliance"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    No registry files found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Arrears & Default Portfolio Auditor sub-dashboard */}
        <div id="arrears-default-portfolio-auditor" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Arrears & Default Portfolio Monitor</h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter, search, and audit active late repayment books and severe defaulted accounts.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold font-mono">
              <span className="flex items-center text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">● In Arrears (KES 100/day)</span>
              <span className="flex items-center text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">● Severe Default (12% Penalty + Demand Letter)</span>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Branch Location</label>
              <select
                id="filter-arr-branch"
                value={portfolioBranchFilter}
                onChange={(e) => setPortfolioBranchFilter(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Loan Officer (PLO)</label>
              <select
                id="filter-arr-plo"
                value={portfolioPloFilter}
                onChange={(e) => setPortfolioPloFilter(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              >
                <option value="">All Officers</option>
                {staff.filter(s => s.role === UserRole.LOAN_OFFICER).map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search Client Name</label>
              <input
                id="filter-arr-client"
                type="text"
                value={portfolioClientSearch}
                onChange={(e) => setPortfolioClientSearch(e.target.value)}
                placeholder="Enter name to search..."
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
              <input
                id="filter-arr-duedate"
                type="date"
                value={portfolioDueDateFilter}
                onChange={(e) => setPortfolioDueDateFilter(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Overdue Days Span</label>
              <select
                id="filter-arr-days"
                value={portfolioOverdueDaysFilter}
                onChange={(e) => setPortfolioOverdueDaysFilter(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              >
                <option value="">Any Overdue Days</option>
                <option value="1">Day 1 Overdue (KES 100 applied)</option>
                <option value="2">Day 2 Overdue (KES 200 applied)</option>
                <option value="3">Day 3 Overdue (KES 300 applied)</option>
                <option value="4+">Day 4+ Default (12% Penalty Applied)</option>
              </select>
            </div>
          </div>

          {/* Arrears List Table */}
          <div className="border border-slate-100 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">LMS Ref / Number</th>
                  <th className="p-3">Client Identity</th>
                  <th className="p-3">Assigned PLO</th>
                  <th className="p-3">Maturity Date</th>
                  <th className="p-3 text-center">Overdue Count</th>
                  <th className="p-3">Remaining Balance</th>
                  <th className="p-3">Penalty / Charge Summary</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPortfolioLoans.length > 0 ? (
                  filteredPortfolioLoans.map(({ loan, client, plo, overdueDays }) => (
                    <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-mono text-slate-900 font-bold">
                          {loan.loanNumber}
                          <p className="text-[10px] font-normal text-slate-400 font-sans mt-0.5">Approved: KES {loan.amountRequested.toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-bold text-slate-800">{client?.fullName || "Client Profile"}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{client?.phoneNumber || "+254700000000"}</p>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-600">
                        {plo?.fullName || "Unassigned"}
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "N/A"}
                      </td>
                      <td className="p-3 text-center font-bold text-rose-600 font-mono text-sm">
                        {overdueDays} Day(s)
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold text-red-600 font-mono">KES {loan.outstandingBalance.toLocaleString()}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-[11px] font-medium text-slate-700 space-y-0.5">
                          <p>Daily Overdue Fee: <span className="font-bold font-mono text-amber-600">KES {(loan.appliedArrearsDays?.length || 0) * 100}</span></p>
                          {loan.defaultPenaltyApplied && (
                            <p className="text-rose-600 font-bold flex items-center">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-1"></span>
                              12% Penalty Applied (+KES {loan.penaltyAmount?.toLocaleString() || 0})
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          loan.status === "Defaulted"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {loan.status === "Defaulted" ? "● Severe Default" : "● In Arrears"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No matching arrears or defaulted loan profiles found in current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal/Slide-up for Document Preview */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">{selectedDoc.name}</h4>
                    <p className="text-[10px] text-slate-400">Associated Profile: {selectedDoc.ownerName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-slate-400 hover:text-white text-sm font-bold bg-slate-850 px-2 py-1 rounded"
                >
                  ✕ Close
                </button>
              </div>

              {/* Modal Body / Mock Document content */}
              <div className="p-6 overflow-y-auto space-y-4 bg-slate-50 flex-1">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Compliance Category</p>
                    <p className="font-bold text-slate-700 mt-0.5">{selectedDoc.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Current Verification Status</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-0.5 ${
                      selectedDoc.status === "Verified"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {selectedDoc.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">File Details & Purpose</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{selectedDoc.details}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">System Integrity Metadata</p>
                    <div className="font-mono text-[9px] text-slate-400 space-y-0.5 mt-0.5">
                      <p>MD5: a6b738194de7194681</p>
                      <p>Secure Hash: SHA-256 Verified</p>
                      <p>Access Privileges: Restricted to MD</p>
                    </div>
                  </div>
                </div>

                {/* Simulated Document Preview Stage */}
                <div className="border border-dashed border-slate-300 rounded-lg p-12 bg-white flex flex-col items-center justify-center text-center space-y-3 relative">
                  <div className="absolute top-2 left-2 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-mono">
                    ✓ SECURE SERVER LINK
                  </div>
                  <FileText className="h-16 w-16 text-slate-300 stroke-1" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">AMROW LMS Secure Document Host</p>
                    <p className="text-xs text-slate-400 mt-0.5">Kakamega Branch Server Registry ID: {selectedDoc.id}</p>
                  </div>
                  
                  {/* Mock content representation */}
                  <div className="w-full bg-slate-50 p-4 rounded border border-slate-200 text-[11px] font-mono text-left text-slate-600 space-y-2 max-w-md mx-auto">
                    <p className="font-bold border-b pb-1 text-slate-800 text-xs text-center uppercase">★ {selectedDoc.category} Record ★</p>
                    <p><strong>REFERENCE:</strong> {selectedDoc.id.toUpperCase()}-SECURE-2026</p>
                    <p><strong>OWNER PROFILE:</strong> {selectedDoc.ownerName}</p>
                    <p><strong>TIMESTAMP:</strong> {new Date(selectedDoc.uploadedAt).toUTCString()}</p>
                    <p><strong>AUDIT STAMP:</strong> System Checked (OK)</p>
                    <div className="border-t pt-2 text-[10px] text-slate-400 text-center">
                      This represents a legally binding file on the Kakamega County server.
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <span className="text-slate-500 text-[10px]">Registry ID: {selectedDoc.id} | Size: {selectedDoc.size}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      alert(`File download initiated: ${selectedDoc.name} downloaded successfully onto MD terminal.`);
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download Copy
                  </button>
                  {selectedDoc.status !== "Verified" && (
                    <button
                      onClick={() => handleVerifyDoc(selectedDoc.id)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Approve & Verify
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. IT Configurations & MD Digital Signature Override Workspace */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">IT Configurations & MD Digital Override Hub</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authorized Managing Director Override Panel. Digitally sign and authorize critical system changes proposed by the IT department.
            </p>
          </div>

          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5 font-bold font-mono">
            SECURE AUDITING ENABLED
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Pending proposals for override */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Pending IT System Proposals ({state.lmsChangeRequests?.filter(r => r.type === "system_config" && r.status === "Pending").length || 0})
            </h4>

            {(!state.lmsChangeRequests || state.lmsChangeRequests.filter(r => r.type === "system_config" && r.status === "Pending").length === 0) ? (
              <div className="p-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 italic text-xs space-y-2">
                <Check className="h-8 w-8 text-emerald-500 mx-auto bg-emerald-50 p-1.5 rounded-full" />
                <p>All system configurations are fully approved and synchronized.</p>
                <p className="text-[10px] text-slate-400 font-sans">No pending IT changes require override signature.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.lmsChangeRequests
                  .filter(r => r.type === "system_config" && r.status === "Pending")
                  .map((req) => {
                    return (
                      <div key={req.id} className="p-5 bg-slate-950 text-slate-300 rounded-xl border border-slate-800 font-mono text-xs flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-amber-500 font-bold flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                              <Lock className="h-3.5 w-3.5" /> MD OVERRIDE DEMANDED
                            </span>
                            <span className="text-slate-500 text-[10px]">{new Date(req.requestedAt).toLocaleString()}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-slate-400">
                              Proposed by: <strong className="text-slate-200">{req.requestedByName}</strong> (IT Dept)
                            </p>
                            <p className="text-slate-400">
                              System Parameter: <strong className="text-blue-400">{req.targetId}</strong>
                            </p>
                            <p className="text-slate-400">
                              Proposed New Value: <strong className="text-amber-400 text-sm">{String(req.newValue)}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Digital Signature Signing Block */}
                        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="space-y-0.5">
                              <label className="block text-[10px] text-slate-400 font-bold uppercase">
                                MD Passcode Digital Signature
                              </label>
                              <p className="text-[9px] text-slate-500">Enter Managing Director PIN (1234) to sign</p>
                            </div>
                            
                            <input
                              type="password"
                              value={signatures[req.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSignatures(prev => ({ ...prev, [req.id]: val }));
                              }}
                              placeholder="••••"
                              className="w-full sm:w-24 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-center text-white focus:outline-none focus:border-indigo-500 font-bold font-mono tracking-widest"
                            />
                          </div>

                          {sigErrors[req.id] && (
                            <p className="text-red-500 text-[10px] font-bold">{sigErrors[req.id]}</p>
                          )}

                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              onClick={() => handleRejectConfigOverride(req.id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Decline Change
                            </button>
                            <button
                              onClick={() => handleSignAndApproveConfig(req.id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Sign & Apply Override</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Right Column: Current Active configs summary */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Current Active Parameters
            </h4>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">SMS Gateway API:</span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${state.systemConfig?.smsGatewayActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-800"}`}>
                  {state.systemConfig?.smsGatewayActive ? "ACTIVE" : "DISABLED"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Maintenance Mode:</span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${state.systemConfig?.maintenanceMode ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {state.systemConfig?.maintenanceMode ? "ACTIVE (LOCK)" : "NORMAL"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 font-mono">
                <span className="text-slate-500 font-sans font-medium">Max Disbursement:</span>
                <span className="font-bold text-slate-800">
                  KES {(state.systemConfig?.maxDisbursementLimit || 500000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 font-mono">
                <span className="text-slate-500 font-sans font-medium">Appraisal Fee %:</span>
                <span className="font-bold text-slate-800">
                  {state.systemConfig?.appraisalFeePercent || 2.5}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500 font-sans font-medium">Auto Arrears:</span>
                <span className="font-bold text-slate-800">
                  {state.systemConfig?.autoArrearsDays || 3} Days
                </span>
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-[11px] text-blue-800 space-y-1.5 leading-relaxed">
              <p className="font-bold uppercase tracking-wider text-[9px] text-blue-900 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Corporate Governance Policy
              </p>
              <p>
                In compliance with AMROW microfinance credit policies, all IT modifications to central server limits, SMS systems, and core timelines are subjected to dual-control checks. Any alteration is dormant until digitally signed by the Managing Director.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
