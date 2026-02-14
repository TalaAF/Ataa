// ===== AI - Need Prediction =====
import { getDatabase } from '../db/database';

interface PredictedNeed {
  category: string;
  confidence: number;
  reason: string;
  suggested_quantity: number;
  suggested_urgency: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام',
  water: 'مياه',
  hygiene: 'نظافة',
  medicine: 'ادوية',
  shelter: 'ماوى',
  clothing: 'ملابس',
};

// Rules based on family composition and vulnerability
const COMPOSITION_RULES: Array<{
  condition: (ctx: HouseholdContext) => boolean;
  needs: Array<{ category: string; confidence: number; reason: string; urgency: string }>;
}> = [
  {
    condition: (ctx) => ctx.hasInfants,
    needs: [
      { category: 'food', confidence: 0.95, reason: 'وجود رضع يحتاجون حليب اطفال', urgency: 'high' },
      { category: 'hygiene', confidence: 0.90, reason: 'حفاضات ومستلزمات رضع', urgency: 'high' },
      { category: 'medicine', confidence: 0.70, reason: 'ادوية اطفال وقائية', urgency: 'medium' },
    ],
  },
  {
    condition: (ctx) => ctx.hasElderly,
    needs: [
      { category: 'medicine', confidence: 0.90, reason: 'ادوية مزمنة لكبار السن', urgency: 'high' },
      { category: 'food', confidence: 0.80, reason: 'غذاء مناسب لكبار السن', urgency: 'medium' },
    ],
  },
  {
    condition: (ctx) => ctx.hasDisabled,
    needs: [
      { category: 'medicine', confidence: 0.85, reason: 'مستلزمات طبية لذوي الاعاقة', urgency: 'high' },
      { category: 'hygiene', confidence: 0.75, reason: 'مستلزمات نظافة خاصة', urgency: 'medium' },
    ],
  },
  {
    condition: (ctx) => ctx.hasPregnant,
    needs: [
      { category: 'medicine', confidence: 0.92, reason: 'متابعة طبية ومكملات للحامل', urgency: 'high' },
      { category: 'food', confidence: 0.88, reason: 'تغذية خاصة للحامل', urgency: 'high' },
    ],
  },
  {
    condition: (ctx) => ctx.hasChronicIllness,
    needs: [
      { category: 'medicine', confidence: 0.95, reason: 'ادوية لامراض مزمنة', urgency: 'critical' },
    ],
  },
  {
    condition: (ctx) => ctx.largeFamilySize,
    needs: [
      { category: 'food', confidence: 0.95, reason: 'اسرة كبيرة تحتاج كميات اكبر من الغذاء', urgency: 'high' },
      { category: 'water', confidence: 0.85, reason: 'كمية مياه اكبر للاسرة الكبيرة', urgency: 'high' },
      { category: 'hygiene', confidence: 0.80, reason: 'مستلزمات نظافة لعدد اكبر', urgency: 'medium' },
    ],
  },
  {
    condition: (ctx) => ctx.isNewlyDisplaced,
    needs: [
      { category: 'shelter', confidence: 0.90, reason: 'نازح حديث يحتاج ماوى', urgency: 'critical' },
      { category: 'clothing', confidence: 0.85, reason: 'نازح حديث يحتاج ملابس', urgency: 'high' },
      { category: 'food', confidence: 0.95, reason: 'احتياج غذائي عاجل للنازح الجديد', urgency: 'critical' },
      { category: 'water', confidence: 0.90, reason: 'مياه شرب للنازح الجديد', urgency: 'high' },
    ],
  },
  {
    condition: (ctx) => ctx.hasOrphans,
    needs: [
      { category: 'food', confidence: 0.92, reason: 'تغذية خاصة للايتام', urgency: 'high' },
      { category: 'clothing', confidence: 0.80, reason: 'ملابس للايتام', urgency: 'medium' },
    ],
  },
];

interface HouseholdContext {
  familySize: number;
  largeFamilySize: boolean;
  hasInfants: boolean;
  hasElderly: boolean;
  hasChildren: boolean;
  hasDisabled: boolean;
  hasPregnant: boolean;
  hasChronicIllness: boolean;
  hasOrphans: boolean;
  isFemaleHeaded: boolean;
  isNewlyDisplaced: boolean;
  existingNeedCategories: Set<string>;
  daysSinceRegistration: number;
}

export function predictNeeds(householdId: string): PredictedNeed[] {
  const db = getDatabase();

  const household = db.prepare('SELECT * FROM households WHERE id = ?').get(householdId) as any;
  if (!household) throw new Error('Household not found');

  const members = db.prepare('SELECT * FROM household_members WHERE household_id = ?').all(householdId) as any[];
  const existingNeeds = db.prepare("SELECT category FROM needs WHERE household_id = ? AND status = 'open'").all(householdId) as any[];

  const vulnFlags: string[] = JSON.parse(household.vulnerability_flags || '[]');
  const existingCategories = new Set(existingNeeds.map((n: any) => n.category));

  const daysSinceRegistration = Math.floor(
    (Date.now() - new Date(household.created_at).getTime()) / 86400000
  );

  const ctx: HouseholdContext = {
    familySize: household.family_size,
    largeFamilySize: household.family_size > 5,
    hasInfants: members.some(m => m.age_band === '0-2'),
    hasElderly: members.some(m => m.age_band === '60+'),
    hasChildren: members.some(m => m.age_band === '3-12'),
    hasDisabled: vulnFlags.includes('disabled'),
    hasPregnant: vulnFlags.includes('pregnant'),
    hasChronicIllness: vulnFlags.includes('chronic_illness'),
    hasOrphans: vulnFlags.includes('orphans'),
    isFemaleHeaded: vulnFlags.includes('female_headed'),
    isNewlyDisplaced: household.displacement_status === 'displaced' && daysSinceRegistration < 14,
    existingNeedCategories: existingCategories,
    daysSinceRegistration,
  };

  // Collect all triggered predictions
  const predictions = new Map<string, PredictedNeed>();

  for (const rule of COMPOSITION_RULES) {
    if (rule.condition(ctx)) {
      for (const need of rule.needs) {
        // Skip if already has an open need in this category
        if (existingCategories.has(need.category)) continue;

        const existing = predictions.get(need.category);
        if (!existing || need.confidence > existing.confidence) {
          predictions.set(need.category, {
            category: need.category,
            confidence: need.confidence,
            reason: need.reason,
            suggested_quantity: estimateQuantity(need.category, household.family_size),
            suggested_urgency: need.urgency,
          });
        }
      }
    }
  }

  // Universal needs (everyone needs food and water)
  if (!existingCategories.has('food') && !predictions.has('food')) {
    predictions.set('food', {
      category: 'food',
      confidence: 0.70,
      reason: 'احتياج غذائي اساسي',
      suggested_quantity: estimateQuantity('food', household.family_size),
      suggested_urgency: 'medium',
    });
  }

  if (!existingCategories.has('water') && !predictions.has('water')) {
    predictions.set('water', {
      category: 'water',
      confidence: 0.65,
      reason: 'احتياج مياه اساسي',
      suggested_quantity: estimateQuantity('water', household.family_size),
      suggested_urgency: 'medium',
    });
  }

  // Sort by confidence descending
  return Array.from(predictions.values()).sort((a, b) => b.confidence - a.confidence);
}

function estimateQuantity(category: string, familySize: number): number {
  const baseQuantities: Record<string, number> = {
    food: 2,
    water: 3,
    hygiene: 1,
    medicine: 1,
    shelter: 1,
    clothing: 1,
  };

  const base = baseQuantities[category] || 1;
  return Math.ceil(base * Math.max(1, familySize / 3));
}
