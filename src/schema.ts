import { EncryptedData } from './crypto';

// Enums for various categories
export enum AssetType {
  STOCK_TW = 'STOCK_TW',
  STOCK_US = 'STOCK_US',
  CRYPTO = 'CRYPTO'
}

export enum Currency {
  TWD = 'TWD',
  USD = 'USD'
}

export interface BaseRecord {
  id?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Invoice Schema
export interface Invoice extends BaseRecord {
  invoiceNumber: string;
  date: Date;
  sellerName: string;
  amount: number;
  currency: Currency;
  items: Array<{ name: string; price: number; quantity: number }>;
}

// Holding Schema (Stock & Crypto)
export interface Holding extends BaseRecord {
  symbol: string;
  assetType: AssetType;
  // Encrypted fields for privacy
  sharesEncrypted: EncryptedData; 
  averageCostEncrypted: EncryptedData;
  currency: Currency;
}

// Credit / Loan Schema
export interface Credit extends BaseRecord {
  bankName: string;
  loanType: string;
  interestRate: number;
  dueDate: number; // Day of the month
  // Encrypted field for outstanding balance
  outstandingBalanceEncrypted: EncryptedData; 
  currency: Currency;
}

export interface UserProfile extends BaseRecord {
  userId: string;
}
