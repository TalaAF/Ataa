// ===== AI - Enhanced Priority Scoring =====
import { getDatabase } from '../db/database';

interface PriorityFactors {
  vulnerability_score: number;
  family_composition_score: number;
  unmet_needs_score: number;
  time_since_distribution_score: number;
  displacement_score: number;
  total_score: number;
  factors: Record<string, number>;
}

const VULNERABILITY_WEIGHTS: Record<string, number> = {
  pregnant: 3,
  disabled: 4,
  chronic_illness: 3,
  elderly_alone: 4,
  orphans: 5,
  female_headed: 2,
  large_family: 2,
};

const DISPLACEMENT_WEIGHTS: Record<string, number> = {
  displaced: 3,
  returnee: 2,
  host: 1,
  other: 1,
};

const AGE_BAND_WEIGHTS: Record<string, number> = {
  '0-2': 4,    // Infants need most care
  '3-12': 2,   // Children
  '13-17': 1,  // Teens
  '18-59': 0,  // Adults
  '60+': 3,    // Elderly
};

export function calculateAIPriority(householdId: string): PriorityFactors {
  const db = getDatabase();

  const household = db.prepare('SELECT * FROM households WHERE id = ?').get(householdId) as any;
  if (!household) throw new Error('Household not found');

  const members = db.prepare('SELECT * FROM household_members WHERE household_id = ?').all(householdId) as any[];
  const openNeeds = db.prepare("SELECT * FROM needs WHERE household_id = ? AND status = 'open'").all(householdId) as any[];
  const lastDist = db.prepare(
    "SELECT MAX(distributed_at) as last_dist FROM distributions WHERE household_id = ? AND status = 'completed'"
  ).get(householdId) as any;

  const factors: Record<string, number> = {};

  // 1. Vulnerability Score (0-20)
  const vulnFlags: string[] = JSON.parse(household.vulnerability_flags || '[]');
  let vulnScore = 0;
  for (const flag of vulnFlags) {
    const w = VULNERABILITY_WEIGHTS[flag] || 1;
    vulnScore += w;
    factors[`vuln_${flag}`] = w;
  }
  vulnScore = Math.min(vulnScore, 20);

  // 2. Family Composition Score (0-10)
  let familyScore = 0;
  if (household.family_size > 6) familyScore += 3;
  else if (household.family_size > 4) familyScore += 2;
  else if (household.family_size > 2) familyScore += 1;
  factors['family_size'] = familyScore;

  // Age-band scoring from members
  let ageBandScore = 0;
  for (const member of members) {
    ageBandScore += AGE_BAND_WEIGHTS[member.age_band] || 0;
  }
  ageBandScore = Math.min(ageBandScore, 7);
  factors['age_composition'] = ageBandScore;
  familyScore += ageBandScore;
  familyScore = Math.min(familyScore, 10);

  // 3. Unmet Needs Score (0-10)
  let needsScore = 0;
  for (const need of openNeeds) {
    const urgencyWeights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    needsScore += urgencyWeights[need.urgency] || 1;
  }
  needsScore = Math.min(needsScore, 10);
  factors['open_needs_count'] = openNeeds.length;
  factors['needs_urgency_total'] = needsScore;

  // 4. Time Since Last Distribution (0-10)
  let timeScore = 0;
  if (lastDist?.last_dist) {
    const daysSince = Math.floor((Date.now() - new Date(lastDist.last_dist).getTime()) / 86400000);
    if (daysSince > 30) timeScore = 10;
    else if (daysSince > 21) timeScore = 7;
    else if (daysSince > 14) timeScore = 5;
    else if (daysSince > 7) timeScore = 3;
    else timeScore = 1;
    factors['days_since_distribution'] = daysSince;
  } else {
    timeScore = 10; // Never received a distribution
    factors['days_since_distribution'] = -1; // Never
  }
  factors['time_score'] = timeScore;

  // 5. Displacement Score (0-5)
  const displacementScore = DISPLACEMENT_WEIGHTS[household.displacement_status] || 1;
  factors['displacement'] = displacementScore;

  // Total (0-55, normalized to 0-30)
  const rawTotal = vulnScore + familyScore + needsScore + timeScore + displacementScore;
  const normalizedTotal = Math.round((rawTotal / 55) * 30);

  return {
    vulnerability_score: vulnScore,
    family_composition_score: familyScore,
    unmet_needs_score: needsScore,
    time_since_distribution_score: timeScore,
    displacement_score: displacementScore,
    total_score: normalizedTotal,
    factors,
  };
}

export function recalculateAllPriorities(): { updated: number } {
  const db = getDatabase();
  const households = db.prepare('SELECT id FROM households').all() as any[];

  const updateStmt = db.prepare("UPDATE households SET priority_score = ?, updated_at = datetime('now') WHERE id = ?");

  let updated = 0;
  db.transaction(() => {
    for (const hh of households) {
      try {
        const result = calculateAIPriority(hh.id);
        updateStmt.run(result.total_score, hh.id);
        updated++;
      } catch {
        // Skip invalid households
      }
    }
  })();

  return { updated };
}
