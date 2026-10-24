export const seedData = {
  properties: [
    {
      id: 'prop-01',
      code: 'DCC-01',
      name: 'Dragon Plaza',
      address: 'C.M. Recto Avenue, Davao City',
      type: 'Mixed-use Building',
      description: 'Main commercial block with retail and office frontage.',
      status: 'Active',
      createdAt: '2023-01-12',
      updatedAt: '2025-09-15',
    },
    {
      id: 'prop-02',
      code: 'DCC-02',
      name: 'Market Street Tower',
      address: 'Quezon Avenue, Davao City',
      type: 'Office Tower',
      description: 'Flexible mid-rise office and service spaces.',
      status: 'Active',
      createdAt: '2021-08-09',
      updatedAt: '2025-07-11',
    },
    {
      id: 'prop-03',
      code: 'DCC-03',
      name: 'Arcade Annex',
      address: 'F. Torres Street, Davao City',
      type: 'Retail Arcade',
      description: 'Ground-floor retail corridor for boutique tenants.',
      status: 'Active',
      createdAt: '2022-05-22',
      updatedAt: '2025-06-17',
    },
  ],
  units: [
    { id: 'unit-01', code: '101', property: 'Dragon Plaza', propertyId: 'prop-01', building: 'Tower A', floor: 'Ground', section: 'Frontage', unitType: 'Retail', area: 35, baseRent: 42000, rateMethod: 'Per sqm', status: 'Occupied', isRentable: true, notes: 'Corner unit with signage frontage.', createdAt: '2023-03-04', updatedAt: '2025-08-20' },
    { id: 'unit-02', code: '102', property: 'Dragon Plaza', propertyId: 'prop-01', building: 'Tower A', floor: 'Ground', section: 'Frontage', unitType: 'Retail', area: 28, baseRent: 33000, rateMethod: 'Per sqm', status: 'Vacant', isRentable: true, notes: 'Ready for leaseup.', createdAt: '2023-03-04', updatedAt: '2025-09-18' },
    { id: 'unit-03', code: '203', property: 'Dragon Plaza', propertyId: 'prop-01', building: 'Tower A', floor: '2nd', section: 'West Wing', unitType: 'Office', area: 52, baseRent: 62000, rateMethod: 'Fixed monthly', status: 'Occupied', isRentable: true, notes: 'Shared meeting room access included.', createdAt: '2023-06-14', updatedAt: '2025-08-19' },
    { id: 'unit-04', code: '204', property: 'Dragon Plaza', propertyId: 'prop-01', building: 'Tower A', floor: '2nd', section: 'East Wing', unitType: 'Office', area: 46, baseRent: 55000, rateMethod: 'Per sqm', status: 'Reserved', isRentable: true, notes: 'Applicant review in progress.', createdAt: '2023-06-14', updatedAt: '2025-09-28' },
    { id: 'unit-05', code: 'B-01', property: 'Market Street Tower', propertyId: 'prop-02', building: 'Tower B', floor: 'Basement', section: 'Parking', unitType: 'Parking', area: 14, baseRent: 2500, rateMethod: 'Fixed monthly', status: 'Occupied', isRentable: false, notes: 'Non-rentable common parking bay.', createdAt: '2021-09-03', updatedAt: '2025-08-15' },
    { id: 'unit-06', code: '301', property: 'Market Street Tower', propertyId: 'prop-02', building: 'Tower B', floor: '3rd', section: 'North', unitType: 'Office', area: 65, baseRent: 72000, rateMethod: 'Per sqm', status: 'Occupied', isRentable: true, notes: 'Corporate tenant lease renewal in progress.', createdAt: '2022-02-09', updatedAt: '2025-09-16' },
    { id: 'unit-07', code: '302', property: 'Market Street Tower', propertyId: 'prop-02', building: 'Tower B', floor: '3rd', section: 'South', unitType: 'Office', area: 60, baseRent: 69000, rateMethod: 'Fixed monthly', status: 'Vacant', isRentable: true, notes: 'Turnkey office ready.', createdAt: '2022-02-09', updatedAt: '2025-09-27' },
    { id: 'unit-08', code: 'G-1', property: 'Arcade Annex', propertyId: 'prop-03', building: 'Annex', floor: 'Ground', section: 'Centerline', unitType: 'Retail', area: 24, baseRent: 29000, rateMethod: 'Fixed monthly', status: 'Occupied', isRentable: true, notes: 'Food kiosk with executive signage rights.', createdAt: '2024-01-21', updatedAt: '2025-09-18' },
    { id: 'unit-09', code: 'G-2', property: 'Arcade Annex', propertyId: 'prop-03', building: 'Annex', floor: 'Ground', section: 'Centerline', unitType: 'Retail', area: 21, baseRent: 26000, rateMethod: 'Per sqm', status: 'Vacant', isRentable: true, notes: 'Promotional leasing package available.', createdAt: '2024-01-21', updatedAt: '2025-09-18' },
    { id: 'unit-10', code: 'ST-01', property: 'Arcade Annex', propertyId: 'prop-03', building: 'Annex', floor: 'Roof', section: 'Utility', unitType: 'Storage', area: 10, baseRent: 0, rateMethod: 'N/A', status: 'Occupied', isRentable: false, notes: 'Excluded from occupancy denominator.', createdAt: '2024-03-11', updatedAt: '2025-08-05' },
  ],
  tenants: [
    { id: 'tenant-01', reference: 'TEN-2024-001', type: 'Business', businessName: 'Cebu Foodworks Co.', tradeName: 'Cebu Foodworks', representative: 'Rafael Dela Cruz', phone: '+63 917 123 4567', email: 'r.dela@cebufoodworks.ph', businessAddress: 'Makati Business District', tin: '009-123-456-000', status: 'Active', notes: 'Night operations with extended dumpster schedule.', createdAt: '2024-02-10' },
    { id: 'tenant-02', reference: 'TEN-2024-002', type: 'Individual', businessName: 'Maricel Santos', tradeName: 'Maricel Beauty Studio', representative: 'Maricel Santos', phone: '+63 920 883 5601', email: 'msantos@gmail.com', businessAddress: 'Davao City', tin: '', status: 'Active', notes: 'Premium beauty and wellness services.', createdAt: '2024-04-12' },
    { id: 'tenant-03', reference: 'TEN-2025-003', type: 'Business', businessName: 'MGC Consulting Group', tradeName: 'MGC Consulting', representative: 'Alyssa Gomez', phone: '+63 912 889 7700', email: 'alyssa@gmc-consulting.com', businessAddress: 'Davao City Business Park', tin: '006-889-041-000', status: 'Active', notes: 'Flexible office expansion scheduled for Q4.', createdAt: '2025-01-28' },
    { id: 'tenant-04', reference: 'TEN-2023-004', type: 'Business', businessName: 'Northwind Logistics', tradeName: 'Northwind', representative: 'Jayson Cruz', phone: '+63 901 444 2277', email: 'info@northwind-logistics.ph', businessAddress: 'Lanang, Davao City', tin: '010-994-110-000', status: 'Inactive', notes: 'Were moved to a larger warehouse in late 2024.', createdAt: '2023-11-03' },
  ],
  leases: [
    { id: 'lease-01', contractNumber: 'DCC-LS-2401', tenantId: 'tenant-01', tenantName: 'Cebu Foodworks Co.', units: ['unit-01'], startDate: '2024-01-01', endDate: '2026-12-31', status: 'Active', monthlyRent: 42000, rateMethod: 'Per sqm', billingFrequency: 'Monthly', dueDay: 5, gracePeriod: 5, securityDeposit: 84000, advanceRent: 42000, escalationTerms: '3% annual escalations', utilityArrangement: 'Tenant pays direct utility', specialProvisions: 'Exclusive signage right on facade', approvedBy: 'N. Ramos', createdAt: '2023-12-14' },
    { id: 'lease-02', contractNumber: 'DCC-LS-2402', tenantId: 'tenant-02', tenantName: 'Maricel Beauty Studio', units: ['unit-08'], startDate: '2024-04-16', endDate: '2027-04-15', status: 'Active', monthlyRent: 29000, rateMethod: 'Fixed monthly', billingFrequency: 'Monthly', dueDay: 10, gracePeriod: 3, securityDeposit: 58000, advanceRent: 29000, escalationTerms: '2.5% annual escalation', utilityArrangement: 'Shared utility allocation', specialProvisions: 'No major fit-out changes without approval', approvedBy: 'A. Santos', createdAt: '2024-04-01' },
    { id: 'lease-03', contractNumber: 'DCC-LS-2503', tenantId: 'tenant-03', tenantName: 'MGC Consulting Group', units: ['unit-06'], startDate: '2025-01-01', endDate: '2028-01-01', status: 'Active', monthlyRent: 72000, rateMethod: 'Per sqm', billingFrequency: 'Monthly', dueDay: 6, gracePeriod: 4, securityDeposit: 144000, advanceRent: 72000, escalationTerms: '3% annual escalations', utilityArrangement: 'Landlord billing', specialProvisions: 'Includes shared boardroom access', approvedBy: 'R. Palma', createdAt: '2024-11-27' },
    { id: 'lease-04', contractNumber: 'DCC-LS-2304', tenantId: 'tenant-04', tenantName: 'Northwind Logistics', units: ['unit-07'], startDate: '2023-03-01', endDate: '2024-09-30', status: 'Expired', monthlyRent: 69000, rateMethod: 'Fixed monthly', billingFrequency: 'Monthly', dueDay: 7, gracePeriod: 2, securityDeposit: 138000, advanceRent: 69000, escalationTerms: '3% annual escalations', utilityArrangement: 'Tenant pays direct utility', specialProvisions: 'Defaulted after warehouse relocation', approvedBy: 'L. Cruz', createdAt: '2023-01-19' },
  ],
  invoices: [
    { id: 'inv-01', leaseId: 'lease-01', tenant: 'Cebu Foodworks Co.', period: '2025-09', amount: 42000, balance: 16000, status: 'Partially Paid', dueDate: '2025-09-05', type: 'Rent' },
    { id: 'inv-02', leaseId: 'lease-02', tenant: 'Maricel Beauty Studio', period: '2025-09', amount: 29000, balance: 0, status: 'Paid', dueDate: '2025-09-10', type: 'Rent' },
    { id: 'inv-03', leaseId: 'lease-03', tenant: 'MGC Consulting Group', period: '2025-09', amount: 72000, balance: 18000, status: 'Partially Paid', dueDate: '2025-09-06', type: 'Rent' },
    { id: 'inv-04', leaseId: 'lease-01', tenant: 'Cebu Foodworks Co.', period: '2025-09', amount: 4200, balance: 4200, status: 'Outstanding', dueDate: '2025-09-22', type: 'Utilities' },
    { id: 'inv-05', leaseId: 'lease-04', tenant: 'Northwind Logistics', period: '2024-09', amount: 69000, balance: 69000, status: 'Overdue', dueDate: '2024-09-07', type: 'Rent' },
  ],
  payments: [
    { id: 'pay-01', invoiceId: 'inv-01', tenant: 'Cebu Foodworks Co.', amount: 26000, date: '2025-09-12', method: 'Bank Transfer' },
    { id: 'pay-02', invoiceId: 'inv-02', tenant: 'Maricel Beauty Studio', amount: 29000, date: '2025-09-08', method: 'GCash' },
    { id: 'pay-03', invoiceId: 'inv-03', tenant: 'MGC Consulting Group', amount: 54000, date: '2025-09-14', method: 'Bank Transfer' },
    { id: 'pay-04', invoiceId: 'inv-04', tenant: 'Cebu Foodworks Co.', amount: 0, date: '2025-09-18', method: 'Pending' },
  ],
  utilityBills: [
    { id: 'util-01', unit: 'unit-01', period: '2025-09', amount: 4200, status: 'Billed' },
    { id: 'util-02', unit: 'unit-06', period: '2025-09', amount: 3460, status: 'Collected' },
    { id: 'util-03', unit: 'unit-08', period: '2025-09', amount: 2180, status: 'Pending' },
  ],
  escalations: [
    { id: 'esc-01', lease: 'DCC-LS-2401', tenant: 'Cebu Foodworks Co.', nextDate: '2026-01-01', amount: 1260, status: 'Scheduled' },
    { id: 'esc-02', lease: 'DCC-LS-2402', tenant: 'Maricel Beauty Studio', nextDate: '2026-04-16', amount: 725, status: 'Scheduled' },
    { id: 'esc-03', lease: 'DCC-LS-2503', tenant: 'MGC Consulting Group', nextDate: '2026-01-01', amount: 1800, status: 'Scheduled' },
  ],
  activities: [
    { id: 'act-01', title: 'Lease renewed for MGC Consulting Group', detail: 'Renewal package approved by management', timestamp: '2025-09-20T09:30:00' },
    { id: 'act-02', title: 'Payment received from Maricel Beauty Studio', detail: 'GCash payment posted successfully', timestamp: '2025-09-18T15:10:00' },
    { id: 'act-03', title: 'Utility bill generated', detail: 'Dragon Plaza electricity charge for September', timestamp: '2025-09-17T11:45:00' },
    { id: 'act-04', title: 'Vacancy alert generated', detail: 'Unit 302 pending leasing review', timestamp: '2025-09-16T14:20:00' },
  ],
  documents: [
    { id: 'doc-01', type: 'Signed Lease', tenant: 'Cebu Foodworks Co.', lease: 'DCC-LS-2401', name: 'lease_agreement_signed.pdf', status: 'Verified' },
    { id: 'doc-02', type: 'Business Permit', tenant: 'Maricel Beauty Studio', lease: 'DCC-LS-2402', name: 'permit_2025.pdf', status: 'Verified' },
    { id: 'doc-03', type: 'ID', tenant: 'MGC Consulting Group', lease: 'DCC-LS-2503', name: 'rep_id_copy.png', status: 'Pending Review' },
  ],
};

export const dashboardChartData = [
  { month: 'Jan', billing: 210000, collections: 175000, receivables: 79000 },
  { month: 'Feb', billing: 228000, collections: 181000, receivables: 72000 },
  { month: 'Mar', billing: 245000, collections: 192000, receivables: 75000 },
  { month: 'Apr', billing: 252000, collections: 202000, receivables: 71000 },
  { month: 'May', billing: 261000, collections: 210000, receivables: 73000 },
  { month: 'Jun', billing: 270000, collections: 218000, receivables: 70000 },
];

export const occupancyData = [
  { name: 'Occupied', value: 6 },
  { name: 'Vacant', value: 3 },
  { name: 'Reserved', value: 1 },
];

export const agingData = [
  { name: 'Current', value: 42 },
  { name: '31-60 days', value: 18 },
  { name: '61-90 days', value: 10 },
  { name: '90+ days', value: 8 },
];
