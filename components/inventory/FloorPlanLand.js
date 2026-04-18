'use client';

import { useState, useMemo } from 'react';
import { 
  Plus, 
  Map as MapIcon, 
  TreePine, 
  Mountain, 
  Car, 
  Store, 
  LayoutGrid, 
  List,
  Compass,
  Maximize2,
  Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStatusConfig, formatINR, getInventoryStats } from '@/lib/inventory';
import { cn } from '@/lib/utils';
import UnitDrawer from './UnitDrawer';

export default function FloorPlanLand({ projectId, project, units = [], organizationId, onAddUnit, onUpdateUnit, onDeleteUnit }) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewType, setViewType] = useState('grid'); // 'grid' | 'sections'

  // Since it's land, we group by "Blocks" or "Sections"
  const sections = useMemo(() => {
    return units.reduce((acc, unit) => {
      const section = unit.metadata?.section || 'Default Block';
      if (!acc[section]) acc[section] = [];
      acc[section].push(unit);
      return acc;
    }, {});
  }, [units]);

  const stats = useMemo(() => getInventoryStats(units), [units]);

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    setDrawerOpen(true);
  };

  const handleAddPlot = () => {
    setSelectedUnit(null);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-slate-50/50 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
               <TreePine className="w-5 h-5" />
            </div>
            <div>
               <h3 className="font-bold text-slate-900 leading-none">Plot Layout Visualizer</h3>
               <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Project Layout & Land Inventory</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
               <Button 
                variant={viewType === 'grid' ? 'white' : 'ghost'} 
                size="sm" 
                onClick={() => setViewType('grid')}
                className={cn("h-7 px-3 text-xs gap-1.5", viewType === 'grid' && "bg-white shadow-sm")}
               >
                 <LayoutGrid className="w-3.5 h-3.5" /> Grid View
               </Button>
               <Button 
                variant={viewType === 'sections' ? 'white' : 'ghost'} 
                size="sm" 
                onClick={() => setViewType('sections')}
                className={cn("h-7 px-3 text-xs gap-1.5", viewType === 'sections' && "bg-white shadow-sm")}
               >
                 <TableIcon className="w-3.5 h-3.5" /> Block View
               </Button>
            </div>
            <Button size="sm" onClick={handleAddPlot} className="gap-2">
               <Plus className="w-4 h-4" /> Add Plot
            </Button>
         </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-100 bg-white">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
           <StatChip status="available" count={stats.available} />
           <StatChip status="reserved" count={stats.reserved} />
           <StatChip status="sold" count={stats.sold} />
           <StatChip status="blocked" count={stats.blocked} />
        </div>
        
        <div className="ml-auto hidden md:flex items-center gap-6 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
           <div className="flex flex-col items-end">
              <span className="opacity-60 mb-0.5">Total Value</span>
              <span className="text-slate-900">{formatINR(stats.totalValue)}</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="opacity-60 mb-0.5">Total Plots</span>
              <span className="text-slate-900">{stats.total} created</span>
           </div>
        </div>
      </div>

      {/* Plot Canvas */}
      <TooltipProvider>
        <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
          <div className="max-w-7xl mx-auto">
             {Object.keys(sections).length > 0 ? (
               Object.entries(sections).map(([name, plots]) => (
                 <div key={name} className="mb-10 last:mb-0">
                    <div className="flex items-center gap-3 mb-6">
                       <h4 className="text-sm font-bold text-slate-800 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{name}</h4>
                       <div className="h-[1px] bg-slate-200 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                       {plots.map(plot => (
                          <PlotCell key={plot.id} plot={plot} onClick={() => handleUnitClick(plot)} />
                       ))}
                       <button 
                         onClick={handleAddPlot}
                         className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 transition-all group"
                       >
                          <Plus className="w-6 h-6 mb-1 opacity-40 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">New Plot</span>
                       </button>
                    </div>
                 </div>
               ))
             ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                  <MapIcon className="w-12 h-12 mb-4 opacity-10" />
                  <p className="font-semibold text-sm mb-1 uppercase tracking-wider">No plots defined</p>
                  <p className="text-xs opacity-60">Start adding plots to this project layout</p>
                  <Button onClick={handleAddPlot} variant="outline" className="mt-6 gap-2">
                    <Plus className="w-4 h-4" /> Create Plot
                  </Button>
                </div>
             )}
          </div>
        </div>
      </TooltipProvider>

      {/* Modal - reuse UnitDrawer since it handles plot fields based on projectType='land' */}
      <UnitDrawer 
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={selectedUnit ? 'edit' : 'add'}
        unit={selectedUnit}
        projectType="land"
        projectId={projectId}
        organizationId={organizationId}
        unitConfigs={project?.unit_configs || []}
        onSave={async (data) => {
           try {
              if (selectedUnit) {
                 await onUpdateUnit(selectedUnit.id, data);
              } else {
                 await onAddUnit({ ...data, type: 'land' });
              }
              setDrawerOpen(false);
           } catch (error) {
              console.error('Error saving plot:', error);
           }
        }}
        onDelete={async (id) => {
           if (confirm('Delete this plot?')) {
              await onDeleteUnit(id);
              setDrawerOpen(false);
           }
        }}
      />
    </div>
  );
}

function PlotCell({ plot, onClick }) {
  const style = getStatusConfig(plot.status || 'available');
  const isCorner = plot.metadata?.is_corner || false;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          onClick={onClick}
          className={cn(
             "aspect-square rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col p-4 shadow-sm",
             style.bg,
             style.border,
             "hover:scale-105 hover:shadow-xl active:scale-95 z-0 hover:z-10"
          )}
        >
          {/* Status Label (Top) */}
          <div className="flex justify-between items-start mb-auto">
             <Badge className={cn("text-[9px] h-4 py-0 uppercase tracking-tighter px-1", style.bg, style.border, style.text, "border shadow-none")}>
                {plot.status}
             </Badge>
             {isCorner && (
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white shadow-sm" />
             )}
          </div>

          {/* Plot ID (Center Large) */}
          <div className="flex-1 flex flex-col items-center justify-center py-2">
             <span className={cn("text-xl md:text-2xl font-black", style.text)}>
                {plot.unit_number || plot.title.replace('Plot ', '')}
             </span>
             <span className={cn("text-[10px] uppercase font-black tracking-widest opacity-40 leading-none", style.text)}>
                Plot
             </span>
          </div>

          {/* Sqr Ft (Bottom) */}
          <div className="mt-auto pt-2 border-t border-black/5 flex justify-between items-end">
             <div className="flex flex-col">
                <span className={cn("text-[8px] font-bold uppercase opacity-50", style.text)}>Area</span>
                <span className={cn("text-xs font-black", style.text)}>{plot.size_sqft} <span className="text-[9px] font-normal opacity-70">sqft</span></span>
             </div>
             <Compass className={cn("w-3 h-3 opacity-30", style.text)} />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="p-4 bg-white border border-slate-200">
         <div className="space-y-1.5 min-w-[140px]">
            <p className="font-black text-slate-900 border-b pb-1.5 mb-2 flex justify-between items-center text-sm">
               PLOT {plot.unit_number || plot.title}
               <Badge className="h-4 text-[9px] capitalize">{plot.status}</Badge>
            </p>
            <div className="space-y-1">
               <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-bold uppercase tracking-tighter">Facing</span>
                  <span className="text-slate-900 font-black">{plot.facing || 'East'}</span>
               </div>
               <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-bold uppercase tracking-tighter">Dimensions</span>
                  <span className="text-slate-900 font-black">{plot.metadata?.dimensions || '30x40'}</span>
               </div>
               <Separator className="my-1.5 opacity-50" />
               <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-tighter">Price</span>
                  <span className="text-emerald-700 font-black">{formatINR(plot.price)}</span>
               </div>
            </div>
         </div>
      </TooltipContent>
    </Tooltip>
  );
}

function StatChip({ status, count }) {
  const config = getStatusConfig(status);
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full border whitespace-nowrap",
      config.bg,
      config.border
    )}>
      <div className={cn("w-2 h-2 rounded-full", config.dot)} />
      <span className={cn("text-xs font-bold", config.text)}>{count}</span>
      <span className={cn("text-[10px] uppercase tracking-wider font-semibold opacity-70", config.text)}>
        {status.replace('_', ' ')}
      </span>
    </div>
  );
}

function Separator({ orientation = 'horizontal', className }) {
  return (
    <div className={cn(
      "bg-slate-200",
      orientation === 'horizontal' ? "h-[1px] w-full" : "w-[1px] h-full",
      className
    )} />
  );
}
