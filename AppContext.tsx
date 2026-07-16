import React, { createContext, useContext, useState, useEffect } from "react";
import { DBState, initialDBState } from "../initialData.js";
import { UserRole, Staff, Client, Loan, Transaction, AuditLog, SmsNotification, LoanProduct, Branch, VaultDocument } from "../types.js";

export interface NavigationState {
  tab: string;
  entityType?: "Client" | "Staff" | "Loan" | "Branch";
  entityId?: string;
  title?: string;
}

interface AppContextType {
  state: DBState;
  loading: boolean;
  currentUser: Staff | null;
  currentBranch: Branch | null;
  setCurrentUser: (user: Staff | null) => void;
  updateState: (newState: DBState) => Promise<void>;
  logAction: (action: string, details: string, userOverride?: Staff) => Promise<void>;
  sendSms: (clientId: string, type: SmsNotification["type"], loanRef: string, customText?: string) => Promise<void>;
  calculateFees: (amount: number, productId: string) => {
    interestAmount: number;
    registrationFee: number;
    appraisalFee: number;
    totalRepayment: number;
  };
  triggerPenaltyChecks: (customDate?: string) => Promise<number>;
  systemDate: string;
  setSystemDate: (date: string) => Promise<void>;
  
  // Custom Navigation States
  currentView: NavigationState;
  viewHistory: NavigationState[];
  historyIndex: number;
  navigateTo: (tab: string, entityType?: "Client" | "Staff" | "Loan" | "Branch", entityId?: string, title?: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  activeProfileTab: string;
  setActiveProfileTab: (tab: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DBState>(initialDBState);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [systemDate, setSystemDateState] = useState<string>("2026-07-16T12:00:00Z");

  // Custom Navigation States
  const [currentView, setCurrentView] = useState<NavigationState>({ tab: "dashboard", title: "Home" });
  const [viewHistory, setViewHistory] = useState<NavigationState[]>([{ tab: "dashboard", title: "Home" }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [activeProfileTab, setActiveProfileTab] = useState<string>("personal");

  const navigateTo = (tab: string, entityType?: "Client" | "Staff" | "Loan" | "Branch", entityId?: string, title?: string) => {
    const nextView: NavigationState = { 
      tab, 
      entityType, 
      entityId, 
      title: title || tab.charAt(0).toUpperCase() + tab.slice(1) 
    };
    
    const nextHistory = viewHistory.slice(0, historyIndex + 1);
    nextHistory.push(nextView);
    
    setViewHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setCurrentView(nextView);
    setActiveProfileTab("personal");
  };

  const navigateBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentView(viewHistory[prevIndex]);
    }
  };

  const navigateForward = () => {
    if (historyIndex < viewHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentView(viewHistory[nextIndex]);
    }
  };

  // Sync state from server on load
  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch("/api/db");
        if (res.ok) {
          const data: DBState = await res.json();
          const mergedData: DBState = {
            ...initialDBState,
            ...data,
            documents: data.documents || initialDBState.documents || [],
            systemDate: data.systemDate || initialDBState.systemDate || "2026-07-16T12:00:00Z",
            systemConfig: data.systemConfig || initialDBState.systemConfig
          };
          setState(mergedData);
          if (mergedData.systemDate) {
            setSystemDateState(mergedData.systemDate);
          }
          
          // Clean login gate on startup
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Failed to load state from database server:", err);
      } finally {
        setLoading(false);
      }
    }
    loadState();
  }, []);

  // Update state helper (local state + server sync)
  const updateState = async (newState: DBState) => {
    setState(newState);
    try {
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newState)
      });
    } catch (err) {
      console.error("Failed to save state to server database:", err);
    }
  };

  const setSystemDate = async (newDate: string) => {
    setSystemDateState(newDate);
    const updatedState = {
      ...state,
      systemDate: newDate
    };
    await updateState(updatedState);
  };

  // Find branch of active staff
  const currentBranch = state.branches.find(b => b.id === currentUser?.branchId) || null;

  // Global Logging Utility
  const logAction = async (action: string, details: string, userOverride?: Staff) => {
    const user = userOverride || currentUser;
    if (!user) return;

    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      userFullName: user.fullName,
      userRole: user.role,
      action,
      details,
      timestamp: new Date().toISOString()
    };

    const newState = {
      ...state,
      auditLogs: [newLog, ...state.auditLogs]
    };
    await updateState(newState);
  };

  // Automated SMS sender
  const sendSms = async (clientId: string, type: SmsNotification["type"], loanRef: string, customText?: string) => {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    let message = "";
    const amrowContact = "0700-AMROW-CAP (Kakamega)";

    switch (type) {
      case "Application":
        message = `Dear ${client.fullName}, your loan application ${loanRef} of ${customText} has been received and is being processed. Contact: ${amrowContact}.`;
        break;
      case "Approved":
        message = `Dear ${client.fullName}, your loan application ${loanRef} has been APPROVED. Due on ${customText}. AMROW CAPITAL LTD.`;
        break;
      case "Rejected":
        message = `Dear ${client.fullName}, your loan application ${loanRef} was not successful at this time. Reason: ${customText || "Standard risk indicators"}. AMROW CAPITAL LTD.`;
        break;
      case "Disbursement":
        message = `Dear ${client.fullName}, ${customText} has been disbursed to your mobile number. Due date: ${loanRef}. AMROW CAPITAL LTD.`;
        break;
      case "Payment":
        message = `Dear ${client.fullName}, payment of ${customText} received for ${loanRef}. Your outstanding balance has been updated. AMROW CAPITAL LTD.`;
        break;
      case "Reminder":
        message = `REPAYMENT REMINDER: Dear ${client.fullName}, your repayment of KES ${customText} is due on ${loanRef}. Avoid penalty fees. AMROW CAPITAL LTD.`;
        break;
      case "Late":
        message = `ALERT: Dear ${client.fullName}, your loan ${loanRef} is overdue. A 12% late penalty of KES ${customText} has been applied. Clear immediately.`;
        break;
      case "Demand":
        message = `DEMAND NOTICE: Dear ${client.fullName}, loan ${loanRef} is in severe default. Legal recovery action will commence within 48 hours. AMROW: ${amrowContact}.`;
        break;
      case "Repaid":
        message = `CONGRATULATIONS: Dear ${client.fullName}, your loan ${loanRef} has been fully settled. Thank you for choosing AMROW CAPITAL LTD.`;
        break;
    }

    const newSms: SmsNotification = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      clientId,
      clientName: client.fullName,
      phoneNumber: client.phoneNumber,
      loanRef,
      message,
      type,
      sentAt: new Date().toISOString()
    };

    const newState = {
      ...state,
      smsNotifications: [newSms, ...state.smsNotifications]
    };
    await updateState(newState);
  };

  // Fees & repayment calculation
  const calculateFees = (amount: number, productId: string) => {
    const product = state.loanProducts.find(p => p.id === productId);
    if (!product) return { interestAmount: 0, registrationFee: 0, appraisalFee: 0, totalRepayment: 0 };

    const interestRate = product.interestRatePercent;
    const interestAmount = Math.round(amount * (interestRate / 100));

    // Appraisal and registration fee brackets
    const registrationFee = 500;
    const appraisalFee = amount < 10000 ? 250 : 500;

    const totalRepayment = amount + interestAmount; // Fees are usually charged upfront/out-of-pocket or added

    return {
      interestAmount,
      registrationFee,
      appraisalFee,
      totalRepayment
    };
  };

  // Automated Arrears, Daily Charges, and Default Management Engine
  const triggerPenaltyChecks = async (customDate?: string): Promise<number> => {
    const activeDateStr = customDate || systemDate;
    const today = new Date(activeDateStr);
    let eventsTriggered = 0;

    const newTransactions: Transaction[] = [];
    const newAuditLogs: AuditLog[] = [];
    const newSmsNotifications: SmsNotification[] = [];
    const newDocuments: VaultDocument[] = [];

    const updatedLoans = state.loans.map(loan => {
      // Process only outstanding, disbursed/in arrears/defaulted loans
      if (
        (loan.status === "Disbursed" || loan.status === "In Arrears" || loan.status === "Defaulted") &&
        loan.outstandingBalance > 0 &&
        loan.dueDate
      ) {
        const dueDate = new Date(loan.dueDate);
        const diffTime = today.getTime() - dueDate.getTime();
        
        // Overdue if we are past the due date/time
        if (diffTime > 0) {
          const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
          const actualOverdueDays = diffDays === 0 ? 1 : diffDays; // At least Day 1 overdue if we are past due hour

          let updatedLoan = { ...loan };
          const client = state.clients.find(c => c.id === loan.clientId);
          const staff = state.staff.find(s => s.id === client?.assignedOfficerId) || { fullName: "David Wasike", role: UserRole.LOAN_OFFICER };

          // Automatically change status from "Disbursed" to "In Arrears" immediately
          if (updatedLoan.status === "Disbursed") {
            updatedLoan.status = "In Arrears";
            eventsTriggered++;
          }

          // 1. Daily Arrears Charges of KES 100 for the first 3 days overdue
          const currentArrearsDays = [...(updatedLoan.appliedArrearsDays || [])];
          const daysToApply = [1, 2, 3].filter(d => d <= actualOverdueDays && !currentArrearsDays.includes(d));

          daysToApply.forEach(day => {
            eventsTriggered++;
            updatedLoan.outstandingBalance += 100;
            currentArrearsDays.push(day);

            // Record KES 100 ArrearsCharge transaction
            newTransactions.push({
              id: `tr-arr-${loan.id}-${day}-${Date.now()}`,
              loanId: loan.id,
              clientId: loan.clientId,
              amount: 100,
              type: "ArrearsCharge",
              date: activeDateStr,
              recordedBy: "Automatic System Process",
              notes: `Day ${day} Overdue: KES 100 daily arrears charge applied automatically.`
            });

            // Record Audit Trail
            newAuditLogs.push({
              id: `aud-arr-${loan.id}-${day}-${Date.now()}`,
              userId: "System",
              userFullName: "AMROW Core Processor",
              userRole: UserRole.SUPERVISOR,
              action: "Daily Arrears Charge",
              details: `Applied KES 100 daily charge (Day ${day} Overdue) on loan ${loan.loanNumber} for client ${client?.fullName || "Client"}. Staff Responsible: ${staff.fullName}.`,
              timestamp: activeDateStr
            });

            // Multi-tier Notification generation
            let clientSms = "";
            let escalationNotice = "";

            if (day === 1) {
              clientSms = `ALERT: Dear ${client?.fullName || "Client"}, your loan ${loan.loanNumber} is overdue by 1 day. KES 100 daily arrears charge applied. Please clear immediately or contact your PLO ${staff.fullName}.`;
              escalationNotice = `Day 1 overdue SMS dispatched to client. PLO ${staff.fullName} notified of late status for urgent tracking.`;
            } else if (day === 2) {
              clientSms = `ALERT: Dear ${client?.fullName || "Client"}, your loan ${loan.loanNumber} is overdue by 2 days. KES 200 total late charges accumulated. Please make payment immediately to avoid default.`;
              escalationNotice = `Day 2 overdue SMS dispatched to client. Escalation notification dispatched to Branch Manager to review account.`;
            } else if (day === 3) {
              clientSms = `FINAL ARREARS NOTICE: Dear ${client?.fullName || "Client"}, your loan ${loan.loanNumber} is 3 days overdue. KES 300 charges applied. Pay immediately. A severe 12% default penalty will be charged tomorrow.`;
              escalationNotice = `Day 3 overdue SMS dispatched to client. Escalation notification dispatched to Credit Department.`;
            }

            // Client SMS
            newSmsNotifications.push({
              id: `sms-arr-${loan.id}-${day}-${Date.now()}`,
              clientId: loan.clientId,
              clientName: client?.fullName || "Client",
              phoneNumber: client?.phoneNumber || "+254700000000",
              loanRef: loan.loanNumber,
              message: clientSms,
              type: "Reminder",
              sentAt: activeDateStr
            });

            // Audit Trail Log representing the notification dispatched to staff
            newAuditLogs.push({
              id: `aud-notif-${loan.id}-${day}-${Date.now()}`,
              userId: "System",
              userFullName: "AMROW Notification Center",
              userRole: UserRole.SUPERVISOR,
              action: "Escalation Queue",
              details: escalationNotice,
              timestamp: activeDateStr
            });
          });

          updatedLoan.appliedArrearsDays = currentArrearsDays;

          // 2. Default Penalty (Day 4+) - applied ONCE per default event
          if (actualOverdueDays >= 4 && !updatedLoan.defaultPenaltyApplied) {
            eventsTriggered++;
            updatedLoan.status = "Defaulted";
            updatedLoan.defaultPenaltyApplied = true;

            const baseAmountForPenalty = updatedLoan.outstandingBalance;
            const penaltyAmount = Math.round(baseAmountForPenalty * 0.12);
            updatedLoan.outstandingBalance += penaltyAmount;
            updatedLoan.penaltyAmount = (updatedLoan.penaltyAmount || 0) + penaltyAmount;
            updatedLoan.penaltyAppliedDate = activeDateStr;

            // Record PenaltyCharge transaction
            newTransactions.push({
              id: `tr-def-${loan.id}-${Date.now()}`,
              loanId: loan.id,
              clientId: loan.clientId,
              amount: penaltyAmount,
              type: "PenaltyCharge",
              date: activeDateStr,
              recordedBy: "Automatic System Process",
              notes: `Automatic 12% default penalty of KES ${penaltyAmount} applied on outstanding KES ${baseAmountForPenalty}.`
            });

            // Record Audit Trail
            newAuditLogs.push({
              id: `aud-def-${loan.id}-${Date.now()}`,
              userId: "System",
              userFullName: "AMROW Core Processor",
              userRole: UserRole.SUPERVISOR,
              action: "Default Status & Penalty",
              details: `Loan ${loan.loanNumber} has defaulted on Day 4 Overdue. Automatically applied one-time 12% default penalty of KES ${penaltyAmount}. Staff Responsible: ${staff.fullName}.`,
              timestamp: activeDateStr
            });

            // Generate compliance demand letter
            const demandDocId = `doc-demand-${loan.id}-${Date.now()}`;
            newDocuments.push({
              id: demandDocId,
              name: `Demand Letter - ${client?.fullName || "Client"} (${loan.loanNumber}).pdf`,
              ownerName: `${client?.fullName || "Client"} (Loan ${loan.loanNumber})`,
              ownerType: "Loan",
              category: "Loan Compliance",
              uploadedAt: activeDateStr,
              status: "Pending Review",
              size: "1.2 MB",
              mimetype: "application/pdf",
              details: `AMROW CAPITAL formal demand notice. Loan has defaulted on Day 4 overdue. Outstanding Balance: KES ${updatedLoan.outstandingBalance} (including KES 300 arrears charges & 12% default penalty). Staff: ${staff.fullName}.`
            });

            // Day 4 Client default SMS notification
            const clientDefaultSms = `DEMAND NOTICE: Dear ${client?.fullName || "Client"}, your loan ${loan.loanNumber} has DEFAULTED. A 12% penalty of KES ${penaltyAmount} has been applied. Formal legal demand letter has been generated.`;
            newSmsNotifications.push({
              id: `sms-def-${loan.id}-${Date.now()}`,
              clientId: loan.clientId,
              clientName: client?.fullName || "Client",
              phoneNumber: client?.phoneNumber || "+254700000000",
              loanRef: loan.loanNumber,
              message: clientDefaultSms,
              type: "Demand",
              sentAt: activeDateStr
            });

            // Day 4 Multi-tier Staff Notification log
            newAuditLogs.push({
              id: `aud-defnotif-${loan.id}-${Date.now()}`,
              userId: "System",
              userFullName: "AMROW Notification Center",
              userRole: UserRole.SUPERVISOR,
              action: "Critical Escalation",
              details: `Default notification on loan ${loan.loanNumber} has been automatically dispatched to: PLO (${staff.fullName}), Branch Manager, Credit Department, Finance Department, and Managing Director (Sebastian Kuti).`,
              timestamp: activeDateStr
            });
          }

          return updatedLoan;
        }
      }
      return loan;
    });

    if (eventsTriggered > 0) {
      const newState: DBState = {
        ...state,
        loans: updatedLoans,
        transactions: [...newTransactions, ...state.transactions],
        auditLogs: [...newAuditLogs, ...state.auditLogs],
        smsNotifications: [...newSmsNotifications, ...(state.smsNotifications || [])],
        documents: [...newDocuments, ...(state.documents || [])]
      };
      await updateState(newState);
    }

    return eventsTriggered;
  };

  return (
    <AppContext.Provider value={{
      state,
      loading,
      currentUser,
      currentBranch,
      setCurrentUser,
      updateState,
      logAction,
      sendSms,
      calculateFees,
      triggerPenaltyChecks,
      systemDate,
      setSystemDate,
      currentView,
      viewHistory,
      historyIndex,
      navigateTo,
      navigateBack,
      navigateForward,
      activeProfileTab,
      setActiveProfileTab
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
