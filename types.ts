export enum UserRole {
  MD = "Managing Director (MD)",
  FINANCE = "Finance Manager",
  BRANCH_MANAGER = "Branch Manager",
  ACCOUNTANT = "Accountant",
  LOAN_OFFICER = "Loan Officer (PLO)",
  SUPERVISOR = "Supervisor",
  IT = "IT Officer (IT)",
  HR = "HR Manager (HR)"
}

export interface Branch {
  id: string;
  name: string;
  county: string;
  code: string;
}

export interface Staff {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  branchId: string;
  status: "Active" | "Suspended" | "Terminated";
  email: string;
  phoneNumber?: string;
  password?: string;
  isVerified?: boolean;
  verificationStatus?: "Pending HR Verification" | "HR Verified";
  itApprovalStatus?: "Pending IT Approval" | "Approved";
  portfolioDetails?: string;
  portfolioStatus?: "None" | "Pending MD Approval" | "MD Approved";
  portfolioTargetClients?: number;
  portfolioTargetCollectionPercent?: number;
  portfolioDisbursementLimit?: number;
  passwordChanged?: boolean;
}

export interface Client {
  id: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  county: string;
  branchId: string;
  assignedOfficerId: string;
  businessType: string;
  businessName: string;
  registeredAt: string;
  status: "Active" | "Inactive";
  referee1Name?: string;
  referee1Phone?: string;
  referee2Name?: string;
  referee2Phone?: string;
  idCardFile?: string;
  clientPhotoFile?: string;
  mpesaStatementFile?: string;
  businessPhotoFile?: string;
  acrossRoadPhotoFile?: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  termWeeks: number;
  interestRatePercent: number; // Confidential
  description: string;
}

export interface Loan {
  id: string;
  loanNumber: string;
  clientId: string;
  productId: string;
  amountRequested: number;
  interestRate: number;
  interestAmount: number;
  registrationFee: number;
  appraisalFee: number;
  totalRepayment: number;
  outstandingBalance: number;
  penaltyAmount: number;
  appliedPenaltyPercent: number;
  penaltyAppliedDate?: string;
  durationWeeks?: number;
  createdAt: string;
  approvedAt?: string;
  disbursedAt?: string;
  dueDate?: string;
  status: "Pending" | "Approved" | "Rejected" | "Disbursed" | "In Arrears" | "Defaulted" | "Fully Repaid";
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  appliedArrearsDays?: number[]; // Day numbers (e.g., [1, 2, 3]) for which KES 100 daily charges are applied
  defaultPenaltyApplied?: boolean; // Whether 12% default penalty is applied
}

export interface Transaction {
  id: string;
  loanId: string;
  clientId: string;
  amount: number;
  type: "Disbursement" | "Repayment" | "PenaltyCharge" | "RegistrationFeeCharge" | "AppraisalFeeCharge" | "ArrearsCharge";
  date: string;
  recordedBy: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userFullName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface SmsNotification {
  id: string;
  clientId: string;
  clientName: string;
  phoneNumber: string;
  loanRef: string;
  message: string;
  type: "Application" | "Approved" | "Rejected" | "Disbursement" | "Payment" | "Reminder" | "Late" | "Demand" | "Repaid" | "Welcome" | "StaffWelcome";
  sentAt: string;
}

export const COUNTIES = ["Kakamega"];
export const EXPANSION_COUNTIES = ["Nairobi", "Kisumu", "Mombasa", "Uasin Gishu", "Nakuru"];

export const BUSINESS_CATEGORIES = [
  "Retail Shop", "Wholesale Shop", "Grocery Store", "Kiosk", "Supermarket", 
  "Hardware", "Agrovet", "Farm Produce Business", "Poultry Farming", "Dairy Farming", 
  "Pig Farming", "Fish Farming", "Beekeeping", "Greenhouse Farming", "Maize Farming", 
  "Sugarcane Farming", "Vegetable Farming", "Fruit Farming", "Coffee Farming", 
  "Tea Farming", "Bodaboda Business", "Taxi Business", "Matatu Business", "Car Hire", 
  "Garage", "Welding", "Carpentry", "Furniture Business", "Construction", 
  "Building Materials Supply", "Salon", "Barbershop", "Beauty Spa", "Boutique", 
  "Tailoring", "Shoe Business", "Electronics Shop", "Mobile Phone Shop", "Computer Services", 
  "Printing Services", "Cyber Café", "M-Pesa Agency", "Bank Agency", "Pharmacy", 
  "Clinic", "Restaurant", "Hotel", "Café", "Fast Food Business", "Bakery", 
  "Catering", "Water Supply", "Gas Supply", "Event Planning", "Cleaning Services", 
  "Laundry", "Daycare Centre", "Private School", "Tuition Centre", "Bookshop", 
  "Consultancy", "Digital Services", "Freelance Business", "Other"
];

export interface SystemConfig {
  smsGatewayActive: boolean;
  maintenanceMode: boolean;
  maxDisbursementLimit: number;
  appraisalFeePercent: number;
  autoArrearsDays: number;
}

export interface LMSChangeRequest {
  id: string;
  type: "product_interest_rate" | "county_expansion" | "system_config";
  targetId: string; // Product ID, county name, or system config key (e.g. "smsGatewayActive", "maintenanceMode")
  newValue: number | string | boolean; // The proposed new value
  requestedBy: string; // Staff ID who requested
  requestedByName: string; // Staff name who requested
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  mdOverrideRequired?: boolean; // Required 'MD Override' flag
  mdOverrideDigitallySigned?: boolean; // Digitally signed/approved by MD
}

export interface VaultDocument {
  id: string;
  name: string;
  ownerName: string;
  ownerType: "Client" | "Loan" | "Staff";
  category: string;
  uploadedAt: string;
  status: "Verified" | "Pending Review";
  size: string;
  mimetype: string;
  details: string;
}

