export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface UserRef {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  isBanned?: boolean;
  bannedAt?: string | null;
  banReason?: string;
}

export interface MemberRow {
  _id: string;
  memberCode: string;
  user: UserRef;
  primaryBranch?: { _id: string; nameEn: string; nameAr: string } | null;
  currentSubscription?:
    | {
        _id: string;
        planNameEn: string;
        planNameAr: string;
        status: string;
        startDate: string | null;
        endDate: string | null;
        finalPrice: number;
        paidAmount: number;
        remainingAmount: number;
      }
    | string
    | null;
  profileImage?: { secureUrl?: string };
  dateOfBirth?: string | null;
  gender?: string | null;
  joinDate?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  qrEnabled?: boolean;
  dailyCheckInLimit?: number;
  createdAt: string;
}

export interface PlanRow {
  _id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  durationDays: number;
  allowedVisits: number;
  freezeDays: number;
  featuresEn: string[];
  featuresAr: string[];
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface SubscriptionRow {
  _id: string;
  member: MemberRow | string;
  planNameEn: string;
  planNameAr: string;
  status: string;
  effectiveStatus?: string;
  daysRemaining?: number;
  startDate: string | null;
  endDate: string | null;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  freezeDaysUsed: number;
  planFreezeDays: number;
  visitsUsed: number;
  createdAt: string;
}

export interface PaymentRow {
  _id: string;
  member: MemberRow | string;
  subscription:
    | { _id: string; planNameEn: string; finalPrice: number; remainingAmount: number; status: string }
    | string;
  amount: number;
  expectedAmount: number;
  senderName: string;
  senderPhone: string;
  transferDate: string | null;
  transactionReference: string;
  paymentMethodLabel: string;
  status: string;
  rejectionReason: string;
  adminNotes: string;
  memberNotes: string;
  receiptNumber: string;
  recordedManually: boolean;
  createdAt: string;
}

export interface PaymentDetail {
  payment: PaymentRow & { proofImagePublicId: string };
  previousAttempts: Array<{
    _id: string;
    amount: number;
    status: string;
    createdAt: string;
    rejectionReason?: string;
    receiptNumber?: string;
  }>;
  auditHistory: Array<{
    _id: string;
    action: string;
    createdAt: string;
    user?: UserRef;
    userLabel?: string;
    metadata?: Record<string, unknown>;
  }>;
  signedProofUrl: string | null;
  signedRefundProofUrl: string | null;
}

export interface AttendanceRow {
  _id: string;
  member: MemberRow | string;
  branch?: { _id: string; nameEn: string } | null;
  checkInAt: string;
  source: string;
  accessStatus: string;
}

export interface BranchRow {
  _id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  phone: string;
  cityEn: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface RoleRow {
  _id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
}

export interface StaffRow {
  _id: string;
  user: UserRef & { isActive: boolean; lastLoginAt?: string };
  role: { _id: string; key: string; nameEn: string; nameAr?: string };
  branch?: { _id: string; nameEn: string; nameAr?: string } | null;
  jobTitleEn: string;
  jobTitleAr?: string;
  isActive: boolean;
}

export interface AccessResult {
  decision: string;
  approved: boolean;
  message: string;
  member: {
    id: string;
    name: string;
    memberCode: string;
    image: string | null;
    phone: string;
    dailyCheckInLimit: number;
    todayCheckIns: number;
  } | null;
  subscription: {
    planNameEn: string;
    planNameAr: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number;
    remainingAmount: number;
    visitsUsed: number;
    allowedVisits: number;
    freezeDaysUsed: number;
    planFreezeDays: number;
  } | null;
  lastVisitAt: string | null;
  totalApprovedVisits: number;
  checkInAt: string | null;
}
