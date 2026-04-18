/**
 * Centralized helper functions for Inventory management
 */

export const STATUS_STYLES = {
  available:         { bg: 'bg-emerald-50',   border: 'border-emerald-200', text: 'text-emerald-700',  dot: 'bg-emerald-500'  },
  reserved:          { bg: 'bg-amber-50',     border: 'border-amber-200',   text: 'text-amber-700',    dot: 'bg-amber-500'    },
  sold:              { bg: 'bg-rose-50',      border: 'border-rose-200',    text: 'text-rose-700',     dot: 'bg-rose-500'     },
  blocked:           { bg: 'bg-slate-100',    border: 'border-slate-200',   text: 'text-slate-600',    dot: 'bg-slate-500'    },
  under_maintenance: { bg: 'bg-purple-50',    border: 'border-purple-200',  text: 'text-purple-700',   dot: 'bg-purple-500'   },
};

/**
 * Project Status Constants
 */
export const PROJECT_STATUS = {
  PLANNING: 'planning',
  UNDER_CONSTRUCTION: 'under_construction',
  READY_TO_MOVE: 'ready_to_move',
  COMPLETED: 'completed',
};

/**
 * Project Status Configuration
 * Includes labels, visual styles, and functional metadata
 */
export const PROJECT_STATUS_CONFIG = {
  [PROJECT_STATUS.PLANNING]: {
    label: 'Planning',
    variant: 'secondary',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    dot: 'bg-blue-500',
    showPossession: true,
    showCompletion: false
  },
  [PROJECT_STATUS.UNDER_CONSTRUCTION]: {
    label: 'Under Construction',
    variant: 'secondary',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
    dot: 'bg-amber-500',
    showPossession: true,
    showCompletion: false
  },
  [PROJECT_STATUS.READY_TO_MOVE]: {
    label: 'Ready to Move',
    variant: 'default',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
    showPossession: false,
    showCompletion: true
  },
  [PROJECT_STATUS.COMPLETED]: {
    label: 'Completed',
    variant: 'outline',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    showPossession: false,
    showCompletion: true
  }
};

/**
 * Project status options for select components
 */
export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label
}));

export function generateUnitNumber(towerName, floorNumber, index) {
  const floor = String(floorNumber).padStart(1, '0');
  const unitSuffix = String(index + 1).padStart(2, '0');
  if (!towerName) return `${floor}${unitSuffix}`;
  const towerPrefix = (towerName.replace(/[^A-Z0-9]/gi, '').slice(0, 2)).toUpperCase();
  return `${towerPrefix}-${floor}${unitSuffix}`; 
}

export function formatINR(value) {
  if (value === undefined || value === null || isNaN(value)) return '—';
  const val = Number(value);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export function calculateFinalPrice(basePrice, floorRise, plc) {
  return (Number(basePrice) || 0) + (Number(floorRise) || 0) + (Number(plc) || 0);
}

export function getStatusConfig(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.available;
}

export function buildEmptyFloorSlots(tower, units, floorNumber) {
  if (!tower) return [];
  const defaultUnitsCount = tower.units_per_floor || 4;
  const floorUnits = Array.isArray(units) ? units.filter(u => Number(u.floor_number) === Number(floorNumber)) : [];
  
  // Create a fixed size array for the floor based on defaultUnitsCount
  const slots = Array(defaultUnitsCount).fill(null);
  
  // Fill slots based on slot_index stored in metadata, falling back to array index
  floorUnits.forEach((unit, idx) => {
    const slotIdx = unit.metadata?.slot_index !== undefined ? unit.metadata.slot_index : idx;
    if (slotIdx < slots.length) {
      slots[slotIdx] = unit;
    } else {
      // If index is out of bounds, append it
      slots.push(unit);
    }
  });
  
  return slots;
}

export function getInventoryStats(units) {
  if (!Array.isArray(units)) {
    return { available: 0, reserved: 0, sold: 0, blocked: 0, under_maintenance: 0, total: 0, totalValue: 0 };
  }
  
  return units.reduce((acc, unit) => {
    const status = unit.status || 'available';
    acc[status] = (acc[status] || 0) + 1;
    acc.total += 1;
    acc.totalValue += Number(unit.total_price || unit.base_price || 0);
    return acc;
  }, { available: 0, reserved: 0, sold: 0, blocked: 0, under_maintenance: 0, total: 0, totalValue: 0 });
}

export function autoNameTower(existingTowers) {
  const count = (existingTowers || []).length;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (count < 26) return `Tower ${letters[count]}`;
  return `Tower ${count + 1}`;
}
