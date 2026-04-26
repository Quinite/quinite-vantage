'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Building2,
  Layers,
  Home,
  Info,
  MoreVertical,
  MoreHorizontal,
  Edit,
  Trash2,
  LandPlot,
  X,
  Check,
  MousePointer2,
  Zap,
  Trash,
  ChevronRight,
  Compass,
  Store,
  Briefcase,
  ShoppingBag,
  Factory,
  ConciergeBell,
  TreePine,
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventory, useUnitConfigs } from '@/hooks/useInventory';
import { 
  formatINR, 
  getInventoryStats, 
  getStatusConfig,
  buildEmptyFloorSlots,
  generateUnitNumber
} from '@/lib/inventory';
import UnitDialog from './UnitDialog';
import TowerDrawer from './TowerDrawer';
import FloorPlanLand from './FloorPlanLand';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function VisualUnitGrid({ projectId, project, organizationId, readOnly = false }) {
  
  const { 
    towers = [], 
    units = {}, 
    isLoading, 
    addTower, 
    updateTower, 
    deleteTower,
    addUnit, 
    updateUnit, 
    deleteUnit,
    updateUnitStatus,
  } = useInventory({ projectId, organizationId });

  const normalizeProjectStatus = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('ready') || s.includes('move')) return 'ready_to_move';
    if (s.includes('complete') || s.includes('finished')) return 'completed';
    return 'under_construction';
  };

  const { data: unitConfigs = [], isLoading: configsLoading } = useUnitConfigs(projectId);
  
  const queryClient = useQueryClient();
  const [activeTowerId, setActiveTowerId] = useState(null);
  const [selectedConfig, setSelectedConfig] = useState(null); 
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [targetFloor, setTargetFloor] = useState(null);

  useEffect(() => {
    if (towers.length > 0 && !activeTowerId) {
      setActiveTowerId(towers[0].id);
    }
  }, [towers, activeTowerId]);

  const activeTower = towers.find(t => t.id === activeTowerId);
  const towerUnits = units[activeTowerId] || [];
  const unassignedUnits = units['unassigned'] || [];

  // Plot units: unassigned units with a land config — survive tower deletion
  const plotUnits = unassignedUnits.filter(u => u.config?.category === 'land');
  const otherUnassigned = unassignedUnits.filter(u => u.config?.category !== 'land');
  const hasLandConfigs = unitConfigs.some(c => c.category === 'land');

  // UnitDialog needs a projectType hint; the unit's own config category takes priority inside the dialog
  const projectType = 'residential';

  const unitCountsByConfig = useMemo(() => {
    const allUnits = Object.values(units).flat();
    return allUnits.reduce((acc, unit) => {
      const configId = unit.config_id;
      if (configId) {
        acc[configId] = (acc[configId] || 0) + 1;
      }
      return acc;
    }, {});
  }, [units]);

  const getIcon = (type) => {
    const icons = {
      Apartment: Building2,
      Villa: Home,
      'Villa Bungalow': Home,
      Penthouse: ConciergeBell,
      Office: Briefcase,
      Retail: ShoppingBag,
      Showroom: Store,
      Industrial: Factory,
      Plot: Home,
      Land: Building2,
    };
    return icons[type] || Building2;
  };

  const stats = useMemo(() => getInventoryStats(towerUnits), [towerUnits]);

  const handlePaintUnit = async (floorNum, slotIndex = null) => {
    if (!selectedConfig) return;
    
    try {
      const currentFloorUnits = towerUnits.filter(u => Number(u.floor_number) === Number(floorNum));
      const nextIndex = slotIndex !== null ? slotIndex : currentFloorUnits.length;

      await addUnit({
        tower_id: activeTowerId,
        project_id: projectId,
        organization_id: organizationId,
        floor_number: floorNum,
        config_id: selectedConfig.id,
        unit_number: generateUnitNumber(activeTower?.name, floorNum, nextIndex),
        status: 'available',
        transaction_type: selectedConfig.transaction_type || 'sell',
        construction_status: normalizeProjectStatus(project?.status),
        bedrooms: selectedConfig.config_name?.match(/\d+/) ? parseInt(selectedConfig.config_name.match(/\d+/)[0]) : null,
        metadata: {
           slot_index: nextIndex
        },
        carpet_area: selectedConfig.carpet_area || 0,
        built_up_area: selectedConfig.built_up_area || selectedConfig.builtup_area || 0,
        super_built_up_area: selectedConfig.super_built_up_area || selectedConfig.super_builtup_area || 0,
        plot_area: selectedConfig.plot_area || 0,
        base_price: selectedConfig.base_price || 0,
        total_price: selectedConfig.base_price || 0,
        facing: 'North',
      });
      return true;
    } catch (error) {
      console.error('Painting error:', error);
      return false;
    }
  };

  const handleFillFloor = async (floorNum) => {
    if (!selectedConfig) return;
    
    const slots = buildEmptyFloorSlots(activeTower, towerUnits, floorNum);
    const emptyCount = slots.filter(s => !s).length;

    if (emptyCount === 0) return;

    let addedCount = 0;
    const toastId = toast.loading(`Filling floor ${floorNum}...`);
    
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i]) {
        const success = await handlePaintUnit(floorNum, i);
        if (success) addedCount++;
      }
    }
    
    if (addedCount > 0) {
       toast.success(`Added ${addedCount} units to floor ${floorNum}.`, { id: toastId });
    } else {
       toast.error(`Failed to add units.`, { id: toastId });
    }
  };

  const handleOpenAddUnit = (floorNum, slotIndex = null) => {
    if (selectedConfig) {
       handlePaintUnit(floorNum, slotIndex);
    } else {
       setTargetFloor(floorNum);
       setDrawerMode('add_unit');
       setSelectedUnit(null);
       setDrawerOpen(true);
    }
  };

  const handlePaintPlot = async () => {
    if (!selectedConfig || selectedConfig.category !== 'land') return;
    const nextIndex = plotUnits.length;
    try {
      await addUnit({
        tower_id: null,
        floor_number: null,
        config_id: selectedConfig.id,
        unit_number: `P-${String(nextIndex + 1).padStart(2, '0')}`,
        status: 'available',
        transaction_type: selectedConfig.transaction_type || 'sell',
        plot_area: selectedConfig.plot_area || 0,
        base_price: selectedConfig.base_price || 0,
        total_price: selectedConfig.base_price || 0,
        project_id: projectId,
        organization_id: organizationId,
        metadata: { slot_index: nextIndex },
        facing: 'North',
      });
    } catch (error) {
      console.error('Plot paint error:', error);
    }
  };

  const handleEditUnit = (unit) => {
    setSelectedUnit(unit);
    setTargetFloor(unit.floor_number);
    setDrawerMode('edit_unit');
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-24" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-50 border border-slate-200 overflow-hidden shadow-sm min-h-[700px] rounded-2xl">
      {/* Configuration Palette */}
      <aside className="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-xl z-20">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-blue-600" /> Unit Configs
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">Select to fill grid</p>
          </div>
          {selectedConfig && (
             <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
              onClick={() => setSelectedConfig(null)}
             >
               <X className="w-4 h-4" />
             </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-auto p-3 space-y-4 custom-scrollbar">
          <div>
            <div className="flex items-center justify-between px-1 mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Unit Configs</p>
              <span className="text-[10px] font-medium text-slate-400">{unitConfigs.length} Configs</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {unitConfigs.length > 0 ? unitConfigs.map((config) => {
                const isSelected = selectedConfig?.id === config.id;
                const placed = unitCountsByConfig[config.id] || 0;
                const Icon = getIcon(config.property_type);

                return (
                  <div 
                    key={config.id}
                    onClick={() => setSelectedConfig(isSelected ? null : config)}
                    className={cn(
                      "px-3.5 py-3 rounded-2xl border transition-all relative group bg-white overflow-hidden cursor-pointer",
                      isSelected 
                        ? "border-blue-500 bg-blue-50/60 shadow-sm" 
                        : "border-slate-100 hover:border-slate-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3">
                       <div className={cn(
                         "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                         isSelected ? "bg-blue-600 text-white shadow-md" : "bg-slate-50 text-slate-400 border border-slate-100/50"
                       )}>
                          <Icon className="w-4 h-4" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                             <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-tight truncate">
                               {config.config_name || config.property_type}
                             </h4>
                             <span className="text-[10px] font-bold text-blue-600 shrink-0 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50">
                               {formatINR(config.base_price).replace('.00', '').replace('₹', '₹ ')}
                             </span>
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                             <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight truncate">
                                   {config.property_type} • {config.carpet_area || config.plot_area} sqft
                                </span>
                             </div>
                             <span className={cn(
                               "text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none italic bg-slate-100/80 text-slate-500"
                             )}>
                               {placed} Placed
                             </span>
                          </div>
                       </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-10 px-4 border-2 border-dashed rounded-2xl bg-slate-50 border-slate-200">
                  <p className="text-[9px] text-slate-400 font-black uppercase italic">Inventory types missing</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-slate-100/50 min-w-0">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {towers.map(tower => (
              <Button
                key={tower.id}
                variant={activeTowerId === tower.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTowerId(tower.id)}
                className={cn(
                  "px-4 transition-all rounded-lg font-bold shrink-0",
                  activeTowerId === tower.id && "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                {tower.name}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => { setDrawerMode('add_tower'); setDrawerOpen(true); }} className="text-blue-600 border-blue-100 hover:bg-blue-50 shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Tower
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white hidden sm:flex">{stats.total} Total Units</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => { setSelectedUnit(null); setDrawerMode('edit_tower'); setDrawerOpen(true); }}>Edit Tower</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => deleteTower(activeTowerId)}>Delete Tower</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 overflow-x-auto">
          <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
            {selectedConfig && (
              <div className={cn(
                "text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-top-3 sticky top-0 z-50",
                selectedConfig.category === 'land' ? "bg-amber-500" : "bg-blue-600"
              )}>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-xl animate-pulse">
                    {selectedConfig.category === 'land' ? <TreePine className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className={cn("text-sm uppercase tracking-tight", selectedConfig.category === 'land' ? "text-amber-100" : "text-yellow-300")}>
                      {selectedConfig.category === 'land' ? 'Plot Placement Active' : 'Quick-Fill Active'}
                    </h4>
                    <p className="text-[10px] opacity-90 font-bold uppercase tracking-widest">
                      {selectedConfig.category === 'land'
                        ? <>Click the <span className="underline">Plots section</span> below to add <span className="underline">{selectedConfig.config_name || selectedConfig.property_type}</span></>
                        : <>Click empty boxes to place <span className="underline">{selectedConfig.config_name || selectedConfig.property_type}</span></>
                      }
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSelectedConfig(null)} className="h-8 font-black text-xs uppercase px-4 rounded-lg">Done</Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <div className="w-max min-w-full space-y-4">
                {activeTower ? (
                  Array.from({ length: activeTower.total_floors + 1 }, (_, i) => activeTower.total_floors - i).map(floorNum => (
                    <FloorRow
                      key={floorNum}
                      floorNum={floorNum}
                      tower={activeTower}
                      units={towerUnits}
                      onUnitClick={handleEditUnit}
                      onAddUnit={handleOpenAddUnit}
                      onStatusChange={updateUnitStatus}
                      onDeleteUnit={deleteUnit}
                      onFillFloor={() => handleFillFloor(floorNum)}
                      paintingActive={!!selectedConfig && selectedConfig.category !== 'land'}
                    />
                  ))
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <Building2 className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-wider text-slate-300">No towers defined</p>
                    <Button onClick={() => { setDrawerMode('add_tower'); setDrawerOpen(true); }} className="mt-6 bg-slate-900 text-white rounded-xl h-12 px-8 font-bold">Create Tower</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Plots / Land Section */}
            {hasLandConfigs && (
              <PlotsSection
                units={plotUnits}
                paintingActive={selectedConfig?.category === 'land'}
                onUnitClick={handleEditUnit}
                onAddUnit={handlePaintPlot}
                onStatusChange={updateUnitStatus}
                onDeleteUnit={deleteUnit}
                onOpenDialog={() => { setTargetFloor(null); setDrawerMode('add_unit'); setSelectedUnit(null); setDrawerOpen(true); }}
              />
            )}

            {/* Other unassigned (non-land) assets */}
            {otherUnassigned.length > 0 && (
              <div className="pt-10 border-t-2 border-slate-200 border-dashed animate-in fade-in slide-in-from-bottom-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-100 flex items-center justify-center text-white">
                    <LandPlot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Other Assets</h3>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Inventory not mapped to structural grid</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
                  {otherUnassigned.map(unit => (
                    <div key={unit.id} className="min-w-[110px] max-w-[110px]">
                      <UnitCell unit={unit} onClick={() => handleEditUnit(unit)} onStatusChange={updateUnitStatus} onDelete={() => deleteUnit(unit.id)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <UnitDialog
        open={drawerOpen && drawerMode?.includes('unit')}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode?.includes('add') ? 'add' : 'edit'}
        unit={selectedUnit}
        tower={activeTower}
        project={project}
        projectType={projectType}
        unitConfigs={unitConfigs}
        floorNumber={targetFloor}
        towerId={activeTowerId}
        projectId={projectId}
        organizationId={organizationId}
        onSave={drawerMode?.includes('add') ? addUnit : (data) => updateUnit(selectedUnit.id, data)}
        onDelete={deleteUnit}
      />

      <TowerDrawer
        open={drawerOpen && drawerMode?.includes('tower')}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode === 'add_tower' ? 'add' : 'edit'}
        tower={activeTower}
        projectId={projectId}
        organizationId={organizationId}
        existingTowers={towers}
        onSave={drawerMode === 'add_tower' ? addTower : (data) => updateTower(activeTowerId, data)}
        onDelete={deleteTower}
      />
    </div>
  );
}

function PlotsSection({ units, paintingActive, onUnitClick, onAddUnit, onStatusChange, onDeleteUnit, onOpenDialog }) {
  return (
    <div className="pt-6 border-t-2 border-amber-100 border-dashed animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-500 shadow-lg shadow-amber-100 flex items-center justify-center text-white shrink-0">
          <TreePine className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Plots / Land</h3>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
            {units.length > 0 ? `${units.length} plot${units.length !== 1 ? 's' : ''}` : 'No plots yet — select a plot config above to start placing'}
          </p>
        </div>
        {paintingActive && (
          <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
            Click + to place
          </span>
        )}
      </div>

      {/* Plot cells */}
      <div className="flex gap-2 flex-wrap pl-12">
        {units.map(unit => (
          <div key={unit.id} className="shrink-0 min-w-[110px] max-w-[110px]">
            <UnitCell unit={unit} onClick={() => onUnitClick(unit)} onStatusChange={onStatusChange} onDelete={() => onDeleteUnit(unit.id)} />
          </div>
        ))}

        {/* Paint slot — active only when a land config is selected */}
        <div
          onClick={paintingActive ? onAddUnit : undefined}
          className={cn(
            'h-[80px] min-w-[110px] max-w-[110px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all shadow-sm select-none',
            paintingActive
              ? 'border-amber-400 bg-amber-50/50 cursor-pointer hover:bg-amber-100/60 hover:shadow-md hover:-translate-y-0.5 active:scale-95'
              : 'border-amber-100 bg-transparent cursor-default opacity-30'
          )}
        >
          <Plus className={cn('w-4 h-4', paintingActive ? 'text-amber-500' : 'text-amber-200')} />
          {paintingActive && <span className="text-[8px] font-black uppercase tracking-wider text-amber-400">Add Plot</span>}
        </div>

        {/* Manual add via dialog (always available) */}
        {!paintingActive && (
          <button
            onClick={onOpenDialog}
            className="h-[80px] min-w-[110px] rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50 transition-all flex flex-col items-center justify-center text-slate-300 hover:text-amber-500 group shadow-sm"
          >
            <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-tighter">New Plot</span>
          </button>
        )}
      </div>
    </div>
  );
}

function FloorRow({ floorNum, tower, units, onUnitClick, onAddUnit, onStatusChange, onDeleteUnit, onFillFloor, paintingActive }) {
  const slots = useMemo(() => buildEmptyFloorSlots(tower, units, floorNum), [tower, units, floorNum]);
  const isGround = floorNum === 0;

  return (
    <div className="flex items-start gap-3 group/row !mt-2">
      <div className="w-14 pt-1.5 shrink-0 flex flex-col items-end gap-1.5">
        <span className={cn(
          "text-[10px] font-black px-2 py-0.5 rounded-lg border-2 shadow-sm transition-all group-hover/row:bg-blue-500 group-hover/row:text-white",
          isGround ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500"
        )}>
          {isGround ? 'G' : `F${floorNum}`}
        </span>
        {paintingActive && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onFillFloor}
                  className="h-6 rounded-full px-2 text-xs text-blue-600 bg-white hover:bg-blue-500 hover:text-white shadow-sm transition-all"
                >
                  <span className="flex items-center gap-0.5">
                    <Zap className="w-2 h-2 fill-current" />Fill Floor
                  </span> 
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-2">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span>Fill whole floor with active config</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex gap-2 pb-2 pt-0.5 select-none">
        {slots.map((unit, idx) => (
          <div key={idx} className="shrink-0 min-w-[110px] max-w-[110px]">
            {unit ? (
              <UnitCell unit={unit} onClick={() => onUnitClick(unit)} onStatusChange={onStatusChange} onDelete={() => onDeleteUnit(unit.id)} />
            ) : (
              <div 
                onClick={() => onAddUnit(floorNum, idx)}
                className="h-[80px] rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/20 transition-all flex items-center justify-center cursor-pointer group/box shadow-sm"
              >
                 <Plus className="w-4 h-4 text-slate-200 group-hover/box:text-blue-400 transition-colors scale-75" />
              </div>
            )}
          </div>
        ))}
        <div className="shrink-0 flex items-center pt-1.5 px-2">
           <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full opacity-0 group-hover/row:opacity-100 transition-all bg-white border border-slate-100 shadow-sm"
            onClick={() => onAddUnit(floorNum, slots.length)}
           >
             <Plus className="w-3.5 h-3.5 text-slate-300" />
           </Button>
        </div>
      </div>
    </div>
  );
}

function UnitCell({ unit, onClick, onStatusChange, onDelete }) {
  const style = getStatusConfig(unit.status);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            onClick={onClick}
            className={cn(
              "p-2.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden h-[80px] flex flex-col justify-between shadow-sm group/cell",
              style.bg,
              style.border,
              "hover:shadow-md hover:-translate-y-0.5 active:scale-95"
            )}
          >
            {/* Header: Number and Delete */}
            <div className="flex justify-between items-start">
              <span className={cn(
                "text-[8px] font-bold leading-none px-1 py-0.5 rounded-md shadow-sm border border-black/5", 
                style.bg === 'bg-white' ? "bg-slate-50 border-slate-100" : "bg-white/40 border-white/10", 
                style.text
              )}>
                {unit.unit_number}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover/cell:opacity-100 transition-all"
              >
                <Trash className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Price section */}
            <div className={cn("text-[10px] font-black tracking-tight leading-none mb-1", style.text)}>
              {formatINR(unit.total_price || unit.base_price)}
            </div>

            {/* Area and Configuration */}
            <div className="flex items-center gap-1.5 overflow-hidden">
               <span className={cn("text-[7px] font-bold uppercase truncate opacity-70", style.text)}>
                  {unit.config?.config_name || unit.config?.property_type || '...'}
               </span>
               <span className={cn("text-[7px] font-medium opacity-40 px-1 border-l", style.text)}>
                  {unit.carpet_area || unit.plot_area || '--'} <span className="text-[5px]">SQFT</span>
               </span>
            </div>

            {/* Footer: Facing and Lead tag */}
            <div className="flex items-center justify-between mt-auto pt-1">
               <span className={cn("text-[8px] font-black uppercase tracking-widest", style.text)}>
                {unit.facing || 'North'}
               </span>
               {unit.lead_id && (
                  <Badge className="h-3.5 px-1 bg-blue-500 text-white border-0 text-[6px] font-black rounded-sm shadow-sm">LEAD</Badge>
               )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-4 bg-white border border-slate-200 shadow-xl rounded-xl z-50">
           <div className="space-y-2 min-w-[170px]">
              <div className="flex justify-between items-center border-b pb-2">
                 <p className="font-black text-slate-900">Unit {unit.unit_number}</p>
                 <Badge variant="outline" className="text-[8px] uppercase font-black">{unit.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] font-medium pt-1">
                 <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">Config</span> 
                 <span className="text-right text-slate-700 font-bold truncate">{unit.config?.config_name}</span>
                 
                 <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">Area</span> 
                 <span className="text-right text-slate-700 font-bold">{unit.carpet_area || unit.plot_area} sqft</span>
                 
                 <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">Facing</span> 
                 <span className="text-right text-slate-700 font-bold">{unit.facing || 'North'}</span>
                 
                 <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">Price</span> 
                 <span className="text-right font-black text-blue-600">{formatINR(unit.total_price || unit.base_price)}</span>
              </div>
           </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
