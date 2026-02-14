// ===== عطاء - Shared Constants =====

export const APP_NAME = 'عطاء';
export const APP_NAME_EN = 'Ataa';
export const APP_DESCRIPTION = 'نظام توزيع المساعدات الإنسانية';

// --- Theme Colors ---
export const COLORS = {
  primary: {
    main: '#6B8E23',
    light: '#8BA839',
    dark: '#556B2F',
  },
  status: {
    red: '#C84B31',
    orange: '#D68438',
    yellow: '#D4A574',
    green: '#6B8E23',
  },
  neutral: {
    background: '#FAF8F3',
    card: '#FFFFFF',
    surface: '#F0EDE5',
    hover: '#E8E4D8',
  },
  text: {
    primary: '#2C2416',
    secondary: '#5C5445',
    muted: '#8C8474',
  },
  border: {
    main: '#D9D4C8',
    light: '#E8E4D8',
  },
  shadow: {
    sm: 'rgba(107, 142, 35, 0.08)',
    md: 'rgba(107, 142, 35, 0.12)',
    lg: 'rgba(107, 142, 35, 0.15)',
  },
} as const;

// --- Arabic Labels ---
export const LABELS = {
  app: {
    name: 'عطاء',
    tagline: 'نظام توزيع المساعدات الإنسانية',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    dashboard: 'لوحة التحكم',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
  },
  nav: {
    home: 'الرئيسية',
    households: 'الأسر',
    needs: 'الاحتياجات',
    inventory: 'المخزون',
    distribution: 'التوزيع',
    offers: 'العروض',
    requests: 'الطلبات',
    reports: 'التقارير',
    users: 'المستخدمين',
    zones: 'المناطق',
    shelters: 'المراكز',
    donors: 'المتبرعين',
    audit: 'سجل المراجعة',
    sync: 'المزامنة',
  },
  household: {
    title: 'تسجيل أسرة جديدة',
    edit: 'تعديل بيانات الأسرة',
    token: 'رمز الأسرة',
    headName: 'اسم رب الأسرة',
    familySize: 'عدد أفراد الأسرة',
    zone: 'المنطقة',
    shelter: 'المركز/المأوى',
    displacement: 'حالة النزوح',
    vulnerability: 'مؤشرات الضعف',
    priority: 'درجة الأولوية',
    members: 'أفراد الأسرة',
    addMember: 'إضافة فرد',
    notes: 'ملاحظات',
  },
  member: {
    ageBand: 'الفئة العمرية',
    sex: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    specialNeeds: 'احتياجات خاصة',
  },
  need: {
    title: 'تسجيل احتياج',
    category: 'الفئة',
    quantity: 'الكمية',
    urgency: 'الاستعجال',
    status: 'الحالة',
    description: 'الوصف',
  },
  distribution: {
    title: 'توزيع المساعدات',
    newEvent: 'توزيع جديد',
    scanToken: 'مسح رمز الأسرة',
    items: 'المواد',
    confirm: 'تأكيد التوزيع',
    receipt: 'إيصال التوزيع',
  },
  offer: {
    title: 'عرض مساعدة',
    create: 'إنشاء عرض',
    myOffers: 'عروضي',
  },
  request: {
    title: 'طلب مساعدة',
    create: 'إنشاء طلب',
    myRequests: 'طلباتي',
  },
  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    search: 'بحث',
    filter: 'تصفية',
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    confirm: 'تأكيد',
    back: 'رجوع',
    next: 'التالي',
    submit: 'إرسال',
    close: 'إغلاق',
    yes: 'نعم',
    no: 'لا',
    all: 'الكل',
    details: 'التفاصيل',
    actions: 'الإجراءات',
    status: 'الحالة',
    date: 'التاريخ',
    total: 'المجموع',
    export: 'تصدير',
    print: 'طباعة',
    refresh: 'تحديث',
    syncNow: 'مزامنة الآن',
    online: 'متصل',
    offline: 'غير متصل',
    pending: 'قيد الانتظار',
    synced: 'تمت المزامنة',
    conflict: 'تعارض',
  },
  displacement: {
    displaced: 'نازح',
    returnee: 'عائد',
    host: 'مضيف',
    other: 'أخرى',
  },
  urgency: {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    critical: 'حرجة',
  },
  needStatus: {
    open: 'مفتوح',
    partially_met: 'مغطى جزئياً',
    met: 'مغطى',
    cancelled: 'ملغى',
  },
  roles: {
    field_worker: 'عامل ميداني',
    admin: 'مدير',
    donor: 'متبرع',
    auditor: 'مراجع',
    beneficiary: 'مستفيد',
  },
  vulnerability: {
    pregnant: 'حامل',
    disabled: 'ذوي إعاقة',
    chronic_illness: 'مرض مزمن',
    elderly_alone: 'مسن بدون معيل',
    orphans: 'أيتام',
    female_headed: 'أسرة ترأسها أنثى',
    large_family: 'أسرة كبيرة',
  },
} as const;

// --- Vulnerability Score Weights ---
export const VULNERABILITY_WEIGHTS: Record<string, number> = {
  pregnant: 3,
  disabled: 4,
  chronic_illness: 3,
  elderly_alone: 4,
  orphans: 5,
  female_headed: 2,
  large_family: 2,
};

export const AGE_BAND_LABELS: Record<string, string> = {
  '0-2': 'رضيع (0-2)',
  '3-12': 'طفل (3-12)',
  '13-17': 'مراهق (13-17)',
  '18-59': 'بالغ (18-59)',
  '60+': 'مسن (60+)',
};

// --- API Endpoints ---
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
  },
  households: '/api/households',
  members: '/api/members',
  needs: '/api/needs',
  offers: '/api/offers',
  requests: '/api/requests',
  matches: '/api/matches',
  inventory: '/api/inventory',
  distributions: '/api/distributions',
  zones: '/api/zones',
  shelters: '/api/shelters',
  users: '/api/users',
  sync: {
    push: '/api/sync/push',
    pull: '/api/sync/pull',
    status: '/api/sync/status',
  },
  dashboard: {
    summary: '/api/dashboard/summary',
    needsByZone: '/api/dashboard/needs-by-zone',
    inventory: '/api/dashboard/inventory',
    distributions: '/api/dashboard/distributions',
  },
  donor: {
    pledges: '/api/donor/pledges',
    aggregatedNeeds: '/api/donor/aggregated-needs',
    reports: '/api/donor/reports',
  },
} as const;

// --- Priority Score Calculation ---
export function calculatePriorityScore(
  vulnerabilityFlags: string[],
  familySize: number,
  hasInfants: boolean,
  hasElderly: boolean,
  urgentNeedsCount: number
): number {
  let score = 0;

  for (const flag of vulnerabilityFlags) {
    score += VULNERABILITY_WEIGHTS[flag] || 1;
  }

  if (familySize > 6) score += 3;
  else if (familySize > 4) score += 2;
  else if (familySize > 2) score += 1;

  if (hasInfants) score += 2;
  if (hasElderly) score += 2;

  score += urgentNeedsCount * 2;

  return Math.min(score, 30);
}
