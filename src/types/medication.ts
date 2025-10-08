export interface Medication {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  isAvailable: boolean;
  lastUpdated: Date;
  alternatives: string[];
  commonUses: string[];
  contraindications: string[];
}

export interface InventoryItem {
  id: string;
  medicationId: string;
  lotNumber: string;
  expirationDate: Date;
  quantity: number;
  isExpired: boolean;
}

export interface DispensingRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  patientInitials: string;
  quantity: number;
  lotNumber: string;
  expirationDate?: Date;
  dispensedBy: string;
  dispensedAt: Date;
  indication: string;
  notes?: string;
}

export interface StockUpdate {
  medicationId: string;
  newQuantity: number;
  reason: string;
  updatedBy: string;
  updatedAt: Date;
}

export type UserRole = 'provider' | 'pharmacy_staff';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  initials: string;
}