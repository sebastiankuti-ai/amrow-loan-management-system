import { UserRole, Branch, Staff, Client, LoanProduct, Loan, Transaction, AuditLog, SmsNotification, LMSChangeRequest, VaultDocument, SystemConfig } from "./types.js";

export interface DBState {
  branches: Branch[];
  staff: Staff[];
  clients: Client[];
  loanProducts: LoanProduct[];
  loans: Loan[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  smsNotifications: SmsNotification[];
  lmsChangeRequests?: LMSChangeRequest[];
  counties?: string[];
  documents?: VaultDocument[];
  systemDate?: string;
  systemConfig?: SystemConfig;
}

export const initialBranches: Branch[] = [
  { id: "br-kkg-town", name: "Kakamega Head Office (HQ)", county: "Kakamega", code: "AMR-KKG-01" },
  { id: "br-mumias", name: "Mumias Branch", county: "Kakamega", code: "AMR-MUM-02" },
  { id: "br-butere", name: "Butere Branch", county: "Kakamega", code: "AMR-BUT-03" },
  { id: "br-malava", name: "Malava Branch", county: "Kakamega", code: "AMR-MAL-04" },
  { id: "br-lugari", name: "Lugari Branch", county: "Kakamega", code: "AMR-LUG-05" }
];

export const initialStaff: Staff[] = [
  { id: "st-md", username: "md_amrow", fullName: "Sebastian Kuti", role: UserRole.MD, branchId: "br-kkg-town", status: "Active", email: "sebastiankuti@gmail.com", phoneNumber: "+254711001100", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-hr", username: "hr_admin", fullName: "Harriet Rose", role: UserRole.HR, branchId: "br-kkg-town", status: "Active", email: "harriet.rose@amrow.co.ke", phoneNumber: "+254722001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-it", username: "it_admin", fullName: "Kelvin Kiprop", role: UserRole.IT, branchId: "br-kkg-town", status: "Active", email: "kelvin.kiprop@amrow.co.ke", phoneNumber: "+254733001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-finance", username: "finance_mgr", fullName: "Jane Nafula", role: UserRole.FINANCE, branchId: "br-kkg-town", status: "Active", email: "jane.nafula@amrow.co.ke", phoneNumber: "+254744001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-mgr-kkg", username: "mgr_kakamega", fullName: "Charles Omondi", role: UserRole.BRANCH_MANAGER, branchId: "br-kkg-town", status: "Active", email: "charles.omondi@amrow.co.ke", phoneNumber: "+254755001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-mgr-mum", username: "mgr_mumias", fullName: "Grace Makena", role: UserRole.BRANCH_MANAGER, branchId: "br-mumias", status: "Active", email: "grace.makena@amrow.co.ke", phoneNumber: "+254766001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-plo-kkg1", username: "plo_kkg_david", fullName: "David Wasike", role: UserRole.LOAN_OFFICER, branchId: "br-kkg-town", status: "Active", email: "david.wasike@amrow.co.ke", phoneNumber: "+254777001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "MD Approved", portfolioDetails: "Kakamega Central SME Portfolio", portfolioTargetClients: 25, portfolioTargetCollectionPercent: 95, portfolioDisbursementLimit: 500000 },
  { id: "st-plo-kkg2", username: "plo_kkg_mary", fullName: "Mary Atieno", role: UserRole.LOAN_OFFICER, branchId: "br-kkg-town", status: "Active", email: "mary.atieno@amrow.co.ke", phoneNumber: "+254788001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-plo-mum1", username: "plo_mum_alice", fullName: "Alice Chemutai", role: UserRole.LOAN_OFFICER, branchId: "br-mumias", status: "Active", email: "alice.chemutai@amrow.co.ke", phoneNumber: "+254799001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-acc-kkg", username: "acc_kkg_john", fullName: "John Barasa", role: UserRole.ACCOUNTANT, branchId: "br-kkg-town", status: "Active", email: "john.barasa@amrow.co.ke", phoneNumber: "+254712001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" },
  { id: "st-sup-kkg", username: "sup_kkg_rose", fullName: "Rose Wambua", role: UserRole.SUPERVISOR, branchId: "br-kkg-town", status: "Active", email: "rose.wambua@amrow.co.ke", phoneNumber: "+254713001122", isVerified: true, verificationStatus: "HR Verified", itApprovalStatus: "Approved", portfolioStatus: "None" }
];

export const initialLoanProducts: LoanProduct[] = [
  { id: "lp-1w", name: "One Week Loan", termWeeks: 1, interestRatePercent: 10, description: "Short term credit facility with 10% weekly interest." },
  { id: "lp-2w", name: "Two Weeks Loan", termWeeks: 2, interestRatePercent: 21, description: "Bi-weekly credit option at 21% interest." },
  { id: "lp-1m", name: "One Month Loan", termWeeks: 4, interestRatePercent: 25, description: "Monthly business operating credit at 25% interest." }
];

export const initialClients: Client[] = [
  { id: "cl-1", fullName: "Wycliffe Oparanya", idNumber: "28475821", phoneNumber: "0712345678", county: "Kakamega", branchId: "br-kkg-town", assignedOfficerId: "st-plo-kkg1", businessType: "Wholesale Shop", businessName: "Oparanya Enterprises", registeredAt: "2026-06-10T09:00:00Z", status: "Active" },
  { id: "cl-2", fullName: "Mercy Wanjiku", idNumber: "30194857", phoneNumber: "0723456789", county: "Kakamega", branchId: "br-kkg-town", assignedOfficerId: "st-plo-kkg1", businessType: "Agrovet", businessName: "Kakamega Agro-Tech Support", registeredAt: "2026-06-12T10:30:00Z", status: "Active" },
  { id: "cl-3", fullName: "Timothy Wetangula", idNumber: "22948573", phoneNumber: "0734567890", county: "Kakamega", branchId: "br-kkg-town", assignedOfficerId: "st-plo-kkg2", businessType: "Bodaboda Business", businessName: "Wetangula Transporters", registeredAt: "2026-06-15T14:15:00Z", status: "Active" },
  { id: "cl-4", fullName: "Sylvia Khalwale", idNumber: "24958102", phoneNumber: "0745678901", county: "Kakamega", branchId: "br-mumias", assignedOfficerId: "st-plo-mum1", businessType: "Retail Shop", businessName: "Mumias Green Grocery", registeredAt: "2026-06-20T08:45:00Z", status: "Active" },
  { id: "cl-5", fullName: "Emmanuel Barasa", idNumber: "31049582", phoneNumber: "0756789012", county: "Kakamega", branchId: "br-mumias", assignedOfficerId: "st-plo-mum1", businessType: "Sugarcane Farming", businessName: "Barasa Sugar Farms", registeredAt: "2026-06-25T11:20:00Z", status: "Active" },
  { id: "cl-6", fullName: "Phyllis Nabwera", idNumber: "26485930", phoneNumber: "0767890123", county: "Kakamega", branchId: "br-kkg-town", assignedOfficerId: "st-plo-kkg1", businessType: "Salon", businessName: "Elegant Sheen Salon", registeredAt: "2026-07-01T15:00:00Z", status: "Active" }
];

export const initialLoans: Loan[] = [
  {
    id: "ln-1",
    loanNumber: "AMR-LN-2026-0001",
    clientId: "cl-1",
    productId: "lp-1m",
    amountRequested: 20000,
    interestRate: 25,
    interestAmount: 5000,
    registrationFee: 500,
    appraisalFee: 500,
    totalRepayment: 26000,
    outstandingBalance: 0,
    penaltyAmount: 0,
    appliedPenaltyPercent: 12,
    createdAt: "2026-06-10T10:00:00Z",
    approvedAt: "2026-06-11T09:15:00Z",
    disbursedAt: "2026-06-11T14:00:00Z",
    dueDate: "2026-07-09T14:00:00Z",
    status: "Fully Repaid",
    approvedBy: "st-md"
  },
  {
    id: "ln-2",
    loanNumber: "AMR-LN-2026-0002",
    clientId: "cl-2",
    productId: "lp-2w",
    amountRequested: 8000,
    interestRate: 21,
    interestAmount: 1680,
    registrationFee: 500,
    appraisalFee: 250,
    totalRepayment: 10430,
    outstandingBalance: 10430,
    penaltyAmount: 0,
    appliedPenaltyPercent: 12,
    createdAt: "2026-07-01T11:30:00Z",
    approvedAt: "2026-07-02T08:45:00Z",
    disbursedAt: "2026-07-02T12:00:00Z",
    dueDate: "2026-07-16T12:00:00Z", // Active, due tomorrow
    status: "Disbursed",
    approvedBy: "st-md"
  },
  {
    id: "ln-3",
    loanNumber: "AMR-LN-2026-0003",
    clientId: "cl-3",
    productId: "lp-1w",
    amountRequested: 5000,
    interestRate: 10,
    interestAmount: 500,
    registrationFee: 500,
    appraisalFee: 250,
    totalRepayment: 6250,
    outstandingBalance: 7000, // Penalized already
    penaltyAmount: 750, // 12% of 6250 = 750
    appliedPenaltyPercent: 12,
    createdAt: "2026-07-04T09:00:00Z",
    approvedAt: "2026-07-04T10:30:00Z",
    disbursedAt: "2026-07-04T15:00:00Z",
    dueDate: "2026-07-11T15:00:00Z", // Due date was July 11th. Penalty applied after July 14th (3 days late). Today is July 15th.
    status: "Disbursed",
    approvedBy: "st-md",
    penaltyAppliedDate: "2026-07-14T23:59:59Z"
  },
  {
    id: "ln-4",
    loanNumber: "AMR-LN-2026-0004",
    clientId: "cl-4",
    productId: "lp-1m",
    amountRequested: 15000,
    interestRate: 25,
    interestAmount: 3750,
    registrationFee: 500,
    appraisalFee: 500,
    totalRepayment: 19750,
    outstandingBalance: 19750,
    penaltyAmount: 0,
    appliedPenaltyPercent: 12,
    createdAt: "2026-07-10T14:00:00Z",
    status: "Pending"
  },
  {
    id: "ln-5",
    loanNumber: "AMR-LN-2026-0005",
    clientId: "cl-5",
    productId: "lp-1w",
    amountRequested: 12000,
    interestRate: 10,
    interestAmount: 1200,
    registrationFee: 500,
    appraisalFee: 500,
    totalRepayment: 14200,
    outstandingBalance: 14200,
    penaltyAmount: 0,
    appliedPenaltyPercent: 12,
    createdAt: "2026-07-12T09:45:00Z",
    status: "Pending"
  }
];

export const initialTransactions: Transaction[] = [
  { id: "tr-1", loanId: "ln-1", clientId: "cl-1", amount: 20000, type: "Disbursement", date: "2026-06-11T14:00:00Z", recordedBy: "st-acc-kkg", notes: "Disbursement via M-Pesa to 0712345678" },
  { id: "tr-2", loanId: "ln-1", clientId: "cl-1", amount: 26000, type: "Repayment", date: "2026-07-05T10:00:00Z", recordedBy: "st-acc-kkg", notes: "Full repayment received via bank agent" },
  { id: "tr-3", loanId: "ln-2", clientId: "cl-2", amount: 8000, type: "Disbursement", date: "2026-07-02T12:00:00Z", recordedBy: "st-acc-kkg", notes: "Disbursed to M-Pesa" },
  { id: "tr-4", loanId: "ln-3", clientId: "cl-3", amount: 5000, type: "Disbursement", date: "2026-07-04T15:00:00Z", recordedBy: "st-acc-kkg", notes: "Disbursed to M-Pesa" },
  { id: "tr-5", loanId: "ln-3", clientId: "cl-3", amount: 750, type: "PenaltyCharge", date: "2026-07-14T23:59:59Z", recordedBy: "System", notes: "Automatic 12% penalty applied for 3+ days overdue payment." }
];

export const initialAuditLogs: AuditLog[] = [
  { id: "aud-1", userId: "st-md", userFullName: "Sebastian Kuti", userRole: UserRole.MD, action: "User Creation", details: "Created staff account for Charles Omondi (Branch Manager)", timestamp: "2026-06-01T08:00:00Z" },
  { id: "aud-2", userId: "st-md", userFullName: "Sebastian Kuti", userRole: UserRole.MD, action: "User Creation", details: "Created staff account for David Wasike (Loan Officer)", timestamp: "2026-06-01T08:15:00Z" },
  { id: "aud-3", userId: "st-plo-kkg1", userFullName: "David Wasike", userRole: UserRole.LOAN_OFFICER, action: "Client Registration", details: "Registered client Wycliffe Oparanya", timestamp: "2026-06-10T09:00:00Z" },
  { id: "aud-4", userId: "st-plo-kkg1", userFullName: "David Wasike", userRole: UserRole.LOAN_OFFICER, action: "Loan Request", details: "Initiated AMR-LN-2026-0001 for KES 20,000", timestamp: "2026-06-10T10:00:00Z" },
  { id: "aud-5", userId: "st-md", userFullName: "Sebastian Kuti", userRole: UserRole.MD, action: "Loan Approval", details: "Approved AMR-LN-2026-0001 for KES 20,000", timestamp: "2026-06-11T09:15:00Z" },
  { id: "aud-6", userId: "st-acc-kkg", userFullName: "John Barasa", userRole: UserRole.ACCOUNTANT, action: "Loan Disbursement", details: "Disbursed AMR-LN-2026-0001 amount KES 20,000", timestamp: "2026-06-11T14:00:00Z" },
  { id: "aud-7", userId: "st-acc-kkg", userFullName: "John Barasa", userRole: UserRole.ACCOUNTANT, action: "Loan Repayment", details: "Recorded full repayment of KES 26,000 for AMR-LN-2026-0001", timestamp: "2026-07-05T10:00:00Z" }
];

export const initialSmsNotifications: SmsNotification[] = [
  { id: "sms-1", clientId: "cl-1", clientName: "Wycliffe Oparanya", phoneNumber: "0712345678", loanRef: "AMR-LN-2026-0001", message: "Dear Wycliffe Oparanya, your loan application AMR-LN-2026-0001 of KES 20,000 has been received and is being processed. Contact: 0700-AMROW-CAP.", type: "Application", sentAt: "2026-06-10T10:01:00Z" },
  { id: "sms-2", clientId: "cl-1", clientName: "Wycliffe Oparanya", phoneNumber: "0712345678", loanRef: "AMR-LN-2026-0001", message: "Dear Wycliffe Oparanya, your loan application AMR-LN-2026-0001 has been APPROVED. Due on 2026-07-09. Contact: 0700-AMROW-CAP.", type: "Approved", sentAt: "2026-06-11T09:16:00Z" },
  { id: "sms-3", clientId: "cl-1", clientName: "Wycliffe Oparanya", phoneNumber: "0712345678", loanRef: "AMR-LN-2026-0001", message: "Dear Wycliffe Oparanya, KES 20,000 has been disbursed to your mobile number. Due date: 2026-07-09. AMROW CAPITAL LTD.", type: "Disbursement", sentAt: "2026-06-11T14:01:00Z" },
  { id: "sms-4", clientId: "cl-1", clientName: "Wycliffe Oparanya", phoneNumber: "0712345678", loanRef: "AMR-LN-2026-0001", message: "Dear Wycliffe Oparanya, thank you for your payment of KES 26,000. Your loan has been fully settled. AMROW CAPITAL LTD.", type: "Payment", sentAt: "2026-07-05T10:02:00Z" }
];

export const initialDocuments: VaultDocument[] = [
  {
    id: "doc-c1",
    name: "National ID Card Scan.pdf",
    ownerName: "Wycliffe Oparanya",
    ownerType: "Client",
    category: "Client Registry",
    uploadedAt: "2026-06-10T09:15:00Z",
    status: "Verified",
    size: "1.2 MB",
    mimetype: "application/pdf",
    details: "Scan of Front and Back side of Kenyan National ID card for Oparanya Enterprises."
  },
  {
    id: "doc-c2",
    name: "Business License Permit Kakamega.pdf",
    ownerName: "Wycliffe Oparanya",
    ownerType: "Client",
    category: "Client Registry",
    uploadedAt: "2026-06-10T09:20:00Z",
    status: "Verified",
    size: "2.4 MB",
    mimetype: "application/pdf",
    details: "Kakamega County Single Business Permit valid for Kakamega Town HQ operations."
  },
  {
    id: "doc-c3",
    name: "KRA PIN Certificate.pdf",
    ownerName: "Mercy Wanjiku",
    ownerType: "Client",
    category: "Client Registry",
    uploadedAt: "2026-06-12T10:45:00Z",
    status: "Verified",
    size: "820 KB",
    mimetype: "application/pdf",
    details: "Kenya Revenue Authority Tax Registration PIN certificate verification sheet."
  },
  {
    id: "doc-c4",
    name: "Guarantor ID Copy & Signature.pdf",
    ownerName: "Timothy Wetangula",
    ownerType: "Client",
    category: "Client Registry",
    uploadedAt: "2026-06-15T14:30:00Z",
    status: "Pending Review",
    size: "1.5 MB",
    mimetype: "application/pdf",
    details: "Official co-guarantor ID copy and signed Kakamega surety contract."
  },
  {
    id: "doc-l1",
    name: "Loan Contract Agreement AMR-LN-2026-0002.pdf",
    ownerName: "Mercy Wanjiku (Loan AMR-LN-2026-0002)",
    ownerType: "Loan",
    category: "Loan Compliance",
    uploadedAt: "2026-07-01T11:45:00Z",
    status: "Verified",
    size: "3.1 MB",
    mimetype: "application/pdf",
    details: "Digitally signed loan disbursement liability contract with biometric authorization."
  },
  {
    id: "doc-l2",
    name: "Appraisal Worksheet & Cashflow.xlsx",
    ownerName: "Timothy Wetangula (Loan AMR-LN-2026-0003)",
    ownerType: "Loan",
    category: "Loan Compliance",
    uploadedAt: "2026-07-04T09:15:00Z",
    status: "Verified",
    size: "450 KB",
    mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    details: "Kakamega Town appraisal analysis of cashflow, daily turnover, and repayment capacity."
  },
  {
    id: "doc-l3",
    name: "Collateral Registration & Asset Valuation.pdf",
    ownerName: "Sylvia Khalwale (Loan AMR-LN-2026-0004)",
    ownerType: "Loan",
    category: "Loan Compliance",
    uploadedAt: "2026-07-10T14:15:00Z",
    status: "Pending Review",
    size: "1.8 MB",
    mimetype: "application/pdf",
    details: "Valuation of commercial stock and surety assets located in Mumias branch area."
  },
  {
    id: "doc-s1",
    name: "Employment Contract - David Wasike.pdf",
    ownerName: "David Wasike (PLO)",
    ownerType: "Staff",
    category: "Staff HR Files",
    uploadedAt: "2026-06-15T08:00:00Z",
    status: "Verified",
    size: "1.9 MB",
    mimetype: "application/pdf",
    details: "Signed corporate employment contract including Kakamega branch assignment clause."
  },
  {
    id: "doc-s2",
    name: "Academic CV & Professional Background.pdf",
    ownerName: "Mary Atieno (PLO)",
    ownerType: "Staff",
    category: "Staff HR Files",
    uploadedAt: "2026-06-20T08:30:00Z",
    status: "Verified",
    size: "2.1 MB",
    mimetype: "application/pdf",
    details: "Verified CV, certified copies of degrees, and credit bureau report."
  },
  {
    id: "doc-s3",
    name: "Kakamega Ethics & Compliance Agreement.pdf",
    ownerName: "Sebastian Kuti (MD)",
    ownerType: "Staff",
    category: "Staff HR Files",
    uploadedAt: "2026-07-01T08:30:00Z",
    status: "Verified",
    size: "3.4 MB",
    mimetype: "application/pdf",
    details: "Managing Director signed ethical commitment and compliance framework agreement."
  }
];

export const initialDBState: DBState = {
  branches: initialBranches,
  staff: initialStaff,
  clients: initialClients,
  loanProducts: initialLoanProducts,
  loans: initialLoans,
  transactions: initialTransactions,
  auditLogs: initialAuditLogs,
  smsNotifications: initialSmsNotifications,
  lmsChangeRequests: [],
  counties: ["Kakamega"],
  documents: initialDocuments,
  systemDate: "2026-07-16T12:00:00Z",
  systemConfig: {
    smsGatewayActive: true,
    maintenanceMode: false,
    maxDisbursementLimit: 500000,
    appraisalFeePercent: 2.5,
    autoArrearsDays: 3
  }
};
