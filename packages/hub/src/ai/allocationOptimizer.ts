// ===== AI - Allocation Optimizer =====
import { getDatabase } from '../db/database';

interface AllocationSuggestion {
  household_id: string;
  household_token: string;
  head_name: string;
  zone_name: string;
  priority_score: number;
  items: AllocationItem[];
  total_items: number;
}

interface AllocationItem {
  inventory_id: string;
  item_name: string;
  category: string;
  quantity_to_distribute: number;
  need_id: string;
  need_urgency: string;
}

interface InventoryAvailability {
  id: string;
  location_id: string;
  category: string;
  item_name: string;
  qty_available: number;
  qty_reserved: number;
  remaining: number;
}

interface AllocationResult {
  suggestions: AllocationSuggestion[];
  total_households: number;
  total_items_allocated: number;
  unmet_needs: number;
  inventory_utilization: number;
}

export function optimizeAllocation(options: {
  zone_id?: string;
  location_id?: string;
  max_households?: number;
} = {}): AllocationResult {
  const db = getDatabase();

  // 1. Get open needs, ordered by urgency and household priority
  let needsWhere = "WHERE n.status = 'open'";
  const needsParams: any[] = [];

  if (options.zone_id) {
    needsWhere += ' AND h.zone_id = ?';
    needsParams.push(options.zone_id);
  }

  const openNeeds = db.prepare(`
    SELECT n.*, h.token as household_token, h.head_of_household_name as head_name,
      h.priority_score, h.zone_id, z.name as zone_name
    FROM needs n
    JOIN households h ON n.household_id = h.id
    LEFT JOIN zones z ON h.zone_id = z.id
    ${needsWhere}
    ORDER BY
      CASE n.urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      h.priority_score DESC,
      n.created_at ASC
  `).all(...needsParams) as any[];

  // 2. Get available inventory
  let invWhere = 'WHERE (qty_available - qty_reserved) > 0';
  const invParams: any[] = [];

  if (options.location_id) {
    invWhere += ' AND location_id = ?';
    invParams.push(options.location_id);
  }

  const inventory = db.prepare(`
    SELECT *, (qty_available - qty_reserved) as remaining
    FROM inventory
    ${invWhere}
    ORDER BY category, item_name
  `).all(...invParams) as InventoryAvailability[];

  // Build inventory index by category
  const inventoryByCategory = new Map<string, InventoryAvailability[]>();
  for (const inv of inventory) {
    const list = inventoryByCategory.get(inv.category) || [];
    list.push({ ...inv });
    inventoryByCategory.set(inv.category, list);
  }

  // 3. Greedy allocation
  const allocationMap = new Map<string, AllocationSuggestion>();
  let totalAllocated = 0;
  let unmetNeeds = 0;

  const maxHH = options.max_households || 50;
  const householdsAllocated = new Set<string>();

  for (const need of openNeeds) {
    if (householdsAllocated.size >= maxHH) break;

    const categoryInventory = inventoryByCategory.get(need.category);
    if (!categoryInventory || categoryInventory.length === 0) {
      unmetNeeds++;
      continue;
    }

    // Find best matching inventory item
    let bestInv: InventoryAvailability | null = null;
    for (const inv of categoryInventory) {
      if (inv.remaining > 0) {
        bestInv = inv;
        break;
      }
    }

    if (!bestInv) {
      unmetNeeds++;
      continue;
    }

    // Calculate allocation quantity
    const allocQty = Math.min(need.quantity, bestInv.remaining);
    if (allocQty <= 0) {
      unmetNeeds++;
      continue;
    }

    // Deduct from available
    bestInv.remaining -= allocQty;

    // Add to allocation
    householdsAllocated.add(need.household_id);

    if (!allocationMap.has(need.household_id)) {
      allocationMap.set(need.household_id, {
        household_id: need.household_id,
        household_token: need.household_token,
        head_name: need.head_name || need.household_token,
        zone_name: need.zone_name,
        priority_score: need.priority_score,
        items: [],
        total_items: 0,
      });
    }

    const allocation = allocationMap.get(need.household_id)!;
    allocation.items.push({
      inventory_id: bestInv.id,
      item_name: bestInv.item_name,
      category: need.category,
      quantity_to_distribute: allocQty,
      need_id: need.id,
      need_urgency: need.urgency,
    });
    allocation.total_items += allocQty;
    totalAllocated += allocQty;
  }

  // 4. Calculate inventory utilization
  const totalAvailable = inventory.reduce((sum, inv) => sum + (inv.qty_available - inv.qty_reserved), 0);
  const utilization = totalAvailable > 0 ? Math.round((totalAllocated / totalAvailable) * 100) : 0;

  // Sort suggestions by priority score descending
  const suggestions = Array.from(allocationMap.values())
    .sort((a, b) => b.priority_score - a.priority_score);

  return {
    suggestions,
    total_households: suggestions.length,
    total_items_allocated: totalAllocated,
    unmet_needs: unmetNeeds,
    inventory_utilization: utilization,
  };
}
