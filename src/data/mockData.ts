import { Medication, InventoryItem, DispensingRecord, User } from '../types/medication';

export const mockMedications: Medication[] = [
  {
    id: '1',
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    strength: '10mg',
    dosageForm: 'Tablet',
    category: 'Cardiovascular',
    currentStock: 45,
    minStock: 20,
    maxStock: 100,
    isAvailable: true,
    lastUpdated: new Date('2024-12-20T10:30:00'),
    alternatives: ['2', '3'],
    commonUses: ['Hypertension', 'Heart failure'],
    contraindications: ['Pregnancy', 'Angioedema history']
  },
  {
    id: '2',
    name: 'Amlodipine',
    genericName: 'Amlodipine besylate',
    strength: '5mg',
    dosageForm: 'Tablet',
    category: 'Cardiovascular',
    currentStock: 0,
    minStock: 15,
    maxStock: 80,
    isAvailable: false,
    lastUpdated: new Date('2024-12-19T14:15:00'),
    alternatives: ['1', '3'],
    commonUses: ['Hypertension', 'Angina'],
    contraindications: ['Severe aortic stenosis']
  },
  {
    id: '3',
    name: 'Metoprolol',
    genericName: 'Metoprolol tartrate',
    strength: '50mg',
    dosageForm: 'Tablet',
    category: 'Cardiovascular',
    currentStock: 28,
    minStock: 25,
    maxStock: 75,
    isAvailable: true,
    lastUpdated: new Date('2024-12-20T09:00:00'),
    alternatives: ['1', '2'],
    commonUses: ['Hypertension', 'Post-MI', 'Heart failure'],
    contraindications: ['Severe bradycardia', 'Asthma']
  },
  {
    id: '4',
    name: 'Metformin',
    genericName: 'Metformin HCl',
    strength: '500mg',
    dosageForm: 'Tablet',
    category: 'Endocrine',
    currentStock: 67,
    minStock: 30,
    maxStock: 120,
    isAvailable: true,
    lastUpdated: new Date('2024-12-20T11:45:00'),
    alternatives: ['5'],
    commonUses: ['Type 2 diabetes'],
    contraindications: ['Renal impairment', 'Metabolic acidosis']
  },
  {
    id: '5',
    name: 'Glipizide',
    genericName: 'Glipizide',
    strength: '5mg',
    dosageForm: 'Tablet',
    category: 'Endocrine',
    currentStock: 12,
    minStock: 20,
    maxStock: 60,
    isAvailable: true,
    lastUpdated: new Date('2024-12-19T16:30:00'),
    alternatives: ['4'],
    commonUses: ['Type 2 diabetes'],
    contraindications: ['Type 1 diabetes', 'Diabetic ketoacidosis']
  },
  {
    id: '6',
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    strength: '500mg',
    dosageForm: 'Capsule',
    category: 'Antibiotics',
    currentStock: 89,
    minStock: 40,
    maxStock: 150,
    isAvailable: true,
    lastUpdated: new Date('2024-12-20T08:20:00'),
    alternatives: ['7', '8'],
    commonUses: ['Bacterial infections', 'Respiratory tract infections'],
    contraindications: ['Penicillin allergy']
  },
  {
    id: '7',
    name: 'Azithromycin',
    genericName: 'Azithromycin',
    strength: '250mg',
    dosageForm: 'Tablet',
    category: 'Antibiotics',
    currentStock: 3,
    minStock: 15,
    maxStock: 60,
    isAvailable: true,
    lastUpdated: new Date('2024-12-18T13:45:00'),
    alternatives: ['6', '8'],
    commonUses: ['Respiratory infections', 'STDs'],
    contraindications: ['Macrolide allergy', 'QT prolongation']
  },
  {
    id: '8',
    name: 'Ciprofloxacin',
    genericName: 'Ciprofloxacin HCl',
    strength: '500mg',
    dosageForm: 'Tablet',
    category: 'Antibiotics',
    currentStock: 0,
    minStock: 20,
    maxStock: 80,
    isAvailable: false,
    lastUpdated: new Date('2024-12-17T10:00:00'),
    alternatives: ['6', '7'],
    commonUses: ['UTIs', 'GI infections'],
    contraindications: ['Pregnancy', 'Tendon disorders']
  },
  {
    id: '9',
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    strength: '200mg',
    dosageForm: 'Tablet',
    category: 'Analgesics',
    currentStock: 124,
    minStock: 50,
    maxStock: 200,
    isAvailable: true,
    lastUpdated: new Date('2024-12-20T12:30:00'),
    alternatives: ['10'],
    commonUses: ['Pain relief', 'Inflammation', 'Fever reduction'],
    contraindications: ['GI bleeding', 'Kidney disease', 'Heart disease']
  },
  {
    id: '10',
    name: 'Acetaminophen',
    genericName: 'Acetaminophen',
    strength: '500mg',
    dosageForm: 'Tablet',
    category: 'Analgesics',
    currentStock: 87,
    minStock: 40,
    maxStock: 150,
    isAvailable: true,
    lastUpdated: new Date('2024-12-20T11:00:00'),
    alternatives: ['9'],
    commonUses: ['Pain relief', 'Fever reduction'],
    contraindications: ['Liver disease', 'Chronic alcohol use']
  }
];

export const mockInventory: InventoryItem[] = [
  {
    id: 'inv-1',
    medicationId: '1',
    lotNumber: 'LT2024001',
    expirationDate: new Date('2025-08-15'),
    quantity: 45,
    isExpired: false
  },
  {
    id: 'inv-2',
    medicationId: '3',
    lotNumber: 'MT2024003',
    expirationDate: new Date('2025-06-30'),
    quantity: 28,
    isExpired: false
  },
  {
    id: 'inv-3',
    medicationId: '4',
    lotNumber: 'MF2024007',
    expirationDate: new Date('2025-11-20'),
    quantity: 42,
    isExpired: false
  },
  {
    id: 'inv-4',
    medicationId: '4',
    lotNumber: 'MF2023012',
    expirationDate: new Date('2025-02-28'),
    quantity: 25,
    isExpired: false
  },
  {
    id: 'inv-5',
    medicationId: '5',
    lotNumber: 'GL2024002',
    expirationDate: new Date('2025-03-10'),
    quantity: 12,
    isExpired: false
  },
  {
    id: 'inv-6',
    medicationId: '6',
    lotNumber: 'AM2024015',
    expirationDate: new Date('2025-09-05'),
    quantity: 64,
    isExpired: false
  },
  {
    id: 'inv-7',
    medicationId: '6',
    lotNumber: 'AM2023008',
    expirationDate: new Date('2025-04-12'),
    quantity: 25,
    isExpired: false
  },
  {
    id: 'inv-8',
    medicationId: '7',
    lotNumber: 'AZ2024004',
    expirationDate: new Date('2025-04-18'),
    quantity: 3,
    isExpired: false
  },
  // Ibuprofen with multiple lots and different expiration dates
  {
    id: 'inv-9',
    medicationId: '9',
    lotNumber: 'IB2024018',
    expirationDate: new Date('2025-11-10'), // First expiration date mentioned
    quantity: 48,
    isExpired: false
  },
  {
    id: 'inv-10',
    medicationId: '9',
    lotNumber: 'IB2025003',
    expirationDate: new Date('2026-02-24'), // Second expiration date mentioned
    quantity: 76,
    isExpired: false
  },
  {
    id: 'inv-11',
    medicationId: '10',
    lotNumber: 'AC2024009',
    expirationDate: new Date('2025-07-15'),
    quantity: 52,
    isExpired: false
  },
  {
    id: 'inv-12',
    medicationId: '10',
    lotNumber: 'AC2023014',
    expirationDate: new Date('2025-01-30'),
    quantity: 35,
    isExpired: false
  },
  // Add an expired lot to demonstrate functionality
  {
    id: 'inv-13',
    medicationId: '1',
    lotNumber: 'LT2023005',
    expirationDate: new Date('2024-08-20'),
    quantity: 15,
    isExpired: true
  }
];

export const mockDispensingRecords: DispensingRecord[] = [
  {
    id: 'disp-1',
    medicationId: '1',
    medicationName: 'Lisinopril 10mg',
    patientInitials: 'J.D.',
    quantity: 30,
    lotNumber: 'LT2024001',
    dispensedBy: 'Dr. Smith',
    dispensedAt: new Date('2024-12-20T10:15:00'),
    indication: 'Hypertension',
    notes: '30-day supply'
  },
  {
    id: 'disp-2',
    medicationId: '4',
    medicationName: 'Metformin 500mg',
    patientInitials: 'M.R.',
    quantity: 60,
    lotNumber: 'MF2024007',
    dispensedBy: 'Nurse Johnson',
    dispensedAt: new Date('2024-12-20T09:30:00'),
    indication: 'Type 2 diabetes',
    notes: 'Take with meals'
  },
  {
    id: 'disp-3',
    medicationId: '6',
    medicationName: 'Amoxicillin 500mg',
    patientInitials: 'A.L.',
    quantity: 21,
    lotNumber: 'AM2024015',
    dispensedBy: 'Dr. Martinez',
    dispensedAt: new Date('2024-12-19T15:45:00'),
    indication: 'Upper respiratory infection',
    notes: '7-day course'
  },
  {
    id: 'disp-4',
    medicationId: '9',
    medicationName: 'Ibuprofen 200mg',
    patientInitials: 'K.W.',
    quantity: 20,
    lotNumber: 'IB2024018',
    dispensedBy: 'Nurse Johnson',
    dispensedAt: new Date('2024-12-20T11:15:00'),
    indication: 'Pain relief',
    notes: 'Take with food'
  },
  {
    id: 'disp-5',
    medicationId: '9',
    medicationName: 'Ibuprofen 200mg',
    patientInitials: 'R.T.',
    quantity: 30,
    lotNumber: 'IB2025003',
    dispensedBy: 'Dr. Smith',
    dispensedAt: new Date('2024-12-20T14:30:00'),
    indication: 'Inflammation',
    notes: 'Maximum 6 tablets daily'
  }
];

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Dr. Sarah Smith',
    role: 'provider',
    initials: 'SS'
  },
  {
    id: 'user-2',
    name: 'Maria Rodriguez',
    role: 'pharmacy_staff',
    initials: 'MR'
  },
  {
    id: 'user-3',
    name: 'Dr. James Martinez',
    role: 'provider',
    initials: 'JM'
  },
  {
    id: 'user-4',
    name: 'Nurse Patricia Johnson',
    role: 'provider',
    initials: 'PJ'
  }
];