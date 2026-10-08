/**
 * KOTTRAVAI COMPANY & BANK DETAILS CONFIGURATION
 * Centralized store for seller address, GSTIN, and Bank Account details for Offline Invoices.
 */

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branch?: string;
  upiId?: string;
}

export interface CompanyDetails {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  cityStatePincode: string;
  gstin: string;
  state: string;
  stateCode: string;
  email: string;
  phone: string;
  bankDetails: BankDetails;
}

export const KOTTRAVAI_COMPANY_DETAILS: CompanyDetails = {
  companyName: "KOTTRAVAI ENTERPRISES PRIVATE LIMITED",
  addressLine1: "Vazhai Incubator,",
  addressLine2: "S Veerasamy Chettiar College,",
  cityStatePincode: "Puliyangudi - 627855, Tamil Nadu, India",
  gstin: "33AALCK4299D1ZD",
  state: "Tamil Nadu",
  stateCode: "33",
  email: "admin@kottravai.in",
  phone: "+91 99999 99999",
  bankDetails: {
    accountName: "KOTTRAVAI ENTERPRISES PRIVATE LIMITED",
    accountNumber: "00000043712569275",
    ifscCode: "SBIN0071235",
    bankName: "State Bank of India",
    branch: "Puliyangudi Branch",
    upiId: "kottravai@upi"
  }
};
