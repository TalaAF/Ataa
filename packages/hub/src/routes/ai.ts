// ===== Hub - AI Routes =====
import { Router, Response } from 'express';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@ataa/shared';
import { calculateAIPriority, recalculateAllPriorities } from '../ai/priorityScoring';
import { predictNeeds } from '../ai/needPrediction';
import { optimizeAllocation } from '../ai/allocationOptimizer';
import { getDatabase } from '../db/database';

const router = Router();

// Get AI-enhanced priority score for a household
router.get('/priority-score/:householdId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const result = calculateAIPriority(req.params.householdId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Recalculate all household priorities
router.post('/recalculate-priorities', authMiddleware, requireRole(UserRole.ADMIN),
  (req: AuthRequest, res: Response) => {
    try {
      const result = recalculateAllPriorities();
      res.json({ success: true, data: result, message: `Updated ${result.updated} households` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Predict needs for a household
router.get('/predict-needs/:householdId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const predictions = predictNeeds(req.params.householdId);
    res.json({ success: true, data: predictions });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Optimize allocation across households
router.post('/optimize-allocation', authMiddleware, requireRole(UserRole.ADMIN, UserRole.FIELD_WORKER),
  (req: AuthRequest, res: Response) => {
    try {
      const { zone_id, location_id, max_households } = req.body;
      const result = optimizeAllocation({ zone_id, location_id, max_households });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// AI Analytics - aggregated insights
router.get('/analytics', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();

    // Priority distribution
    const priorityDist = db.prepare(`
      SELECT
        CASE
          WHEN priority_score >= 20 THEN 'critical'
          WHEN priority_score >= 13 THEN 'high'
          WHEN priority_score >= 7 THEN 'medium'
          ELSE 'low'
        END as priority_level,
        COUNT(*) as count
      FROM households
      GROUP BY priority_level
      ORDER BY
        CASE priority_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
    `).all();

    // Needs by category with urgency breakdown
    const needsByCategory = db.prepare(`
      SELECT category,
        SUM(CASE WHEN urgency = 'critical' THEN quantity ELSE 0 END) as critical_qty,
        SUM(CASE WHEN urgency = 'high' THEN quantity ELSE 0 END) as high_qty,
        SUM(CASE WHEN urgency = 'medium' THEN quantity ELSE 0 END) as medium_qty,
        SUM(CASE WHEN urgency = 'low' THEN quantity ELSE 0 END) as low_qty,
        SUM(quantity) as total_qty,
        COUNT(*) as total_needs
      FROM needs WHERE status = 'open'
      GROUP BY category
      ORDER BY total_qty DESC
    `).all();

    // Inventory coverage (available vs needed)
    const inventoryCoverage = db.prepare(`
      SELECT
        i.category,
        SUM(i.qty_available - i.qty_reserved) as available,
        COALESCE(n.needed, 0) as needed,
        CASE
          WHEN COALESCE(n.needed, 0) = 0 THEN 100
          ELSE ROUND(MIN(100, (SUM(i.qty_available - i.qty_reserved) * 100.0 / n.needed)))
        END as coverage_pct
      FROM inventory i
      LEFT JOIN (
        SELECT category, SUM(quantity) as needed
        FROM needs WHERE status = 'open'
        GROUP BY category
      ) n ON i.category = n.category
      GROUP BY i.category
    `).all();

    // Households without recent distribution (>14 days)
    const underserved = db.prepare(`
      SELECT COUNT(*) as count FROM households h
      WHERE NOT EXISTS (
        SELECT 1 FROM distributions d
        WHERE d.household_id = h.id AND d.status = 'completed'
        AND d.distributed_at > datetime('now', '-14 days')
      )
    `).get() as any;

    // Trend: needs created per week (last 8 weeks)
    const weeklyTrend = db.prepare(`
      SELECT
        strftime('%Y-W%W', created_at) as week,
        COUNT(*) as needs_count,
        SUM(quantity) as total_quantity
      FROM needs
      WHERE created_at > datetime('now', '-56 days')
      GROUP BY week
      ORDER BY week
    `).all();

    // Top priority households
    const topPriority = db.prepare(`
      SELECT h.id, h.token, h.head_of_household_name, h.priority_score,
        h.family_size, z.name as zone_name,
        (SELECT COUNT(*) FROM needs n WHERE n.household_id = h.id AND n.status = 'open') as open_needs
      FROM households h
      LEFT JOIN zones z ON h.zone_id = z.id
      ORDER BY h.priority_score DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        priority_distribution: priorityDist,
        needs_by_category: needsByCategory,
        inventory_coverage: inventoryCoverage,
        underserved_households: underserved?.count || 0,
        weekly_trend: weeklyTrend,
        top_priority_households: topPriority,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
