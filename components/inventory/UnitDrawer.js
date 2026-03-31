'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Maximize2, 
  IndianRupee, 
  Compass, 
  LayoutGrid,
  Trash2,
  Save,
  User,
  Search,
  Check,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { formatINR, calculateFinalPrice, generateUnitNumber, getStatusConfig } from '@/lib/inventory';
import { useLeads } from '@/hooks/useLeads';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function UnitDrawer({
  open,
  onClose,
  mode = 'add',
  unit,
  tower,
  projectType = 'residential',
  unitConfigs = [],
  floorNumber,
  slotIndex,
  towerId,
  projectId,
  organizationId,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState({
    unit_number: '',
    config_id: '',
    facing: 'North',
    status: 'available',
    base_price: 0,
    floor_rise_price: 0,
    plc_price: 0,
    carpet_area: 0,
    built_up_area: 0,
    super_built_up_area: 0,
    plot_area: 0,
    bedrooms: null,
    bathrooms: null,
    lead_id: null,
    metadata: {},
  });

  const [openLeadPicker, setOpenLeadPicker] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const { data: leadsData } = useLeads({ search: leadSearch, limit: 10 });
  const leads = leadsData?.leads || [];

  useEffect(() => {
    if (mode === 'edit' && unit) {
      setFormData({
        unit_number: unit.unit_number || '',
        config_id: unit.config_id || '',
        facing: unit.facing || 'North',
        status: unit.status || 'available',
        base_price: Number(unit.base_price) || 0,
        floor_rise_price: Number(unit.floor_rise_price) || 0,
        plc_price: Number(unit.plc_price) || 0,
        carpet_area: Number(unit.carpet_area) || 0,
        built_up_area: Number(unit.built_up_area) || 0,
        super_built_up_area: Number(unit.super_built_up_area) || 0,
        plot_area: Number(unit.plot_area) || 0,
        bedrooms: unit.bedrooms || null,
        bathrooms: unit.bathrooms || null,
        lead_id: unit.lead_id || null,
        metadata: unit.metadata || {},
      });
    } else if (mode === 'add' && tower) {
      const generated = generateUnitNumber(tower.name, floorNumber, slotIndex || 0);
      setFormData({
        unit_number: generated,
        config_id: '',
        facing: 'North',
        status: 'available',
        base_price: 0,
        floor_rise_price: 0,
        plc_price: 0,
        carpet_area: 0,
        built_up_area: 0,
        super_built_up_area: 0,
        plot_area: 0,
        bedrooms: null,
        bathrooms: null,
        lead_id: null,
        metadata: {},
      });
    }
  }, [mode, unit, tower, floorNumber, slotIndex, towerId, open]);

  const handleConfigChange = (configId) => {
    const config = unitConfigs.find(c => c.id === configId);
    
    if (config) {
      setFormData(prev => ({
        ...prev,
        config_id: configId,
        carpet_area: config.carpet_area || 0,
        built_up_area: config.built_up_area || config.builtup_area || 0,
        super_built_up_area: config.super_built_up_area || config.super_builtup_area || 0,
        plot_area: config.plot_area || 0,
        base_price: config.base_price || 0,
        bedrooms: config.config_name?.toLowerCase().includes('bhk') ? parseInt(config.config_name) : null
      }));
    } else {
      setFormData(prev => ({ ...prev, config_id: configId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPrice = calculateFinalPrice(formData.base_price, formData.floor_rise_price, formData.plc_price);
    
    const payload = {
      ...formData,
      total_price: finalPrice,
      tower_id: towerId,
      floor_number: floorNumber,
      slot_index: slotIndex,
      project_id: projectId,
      organization_id: organizationId,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Error saving unit:', error);
      toast.error('Failed to save unit');
    }
  };

  const finalPrice = calculateFinalPrice(formData.base_price, formData.floor_rise_price, formData.plc_price);
  const selectedLead = leads.find(l => l.id === formData.lead_id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col border-l shadow-2xl overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <SheetHeader className="p-6 bg-white border-b relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold text-slate-900">
                {mode === 'add' ? 'Add Unit' : `Unit ${formData.unit_number}`}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 font-medium">
                {tower?.name} • Floor {floorNumber === 0 ? 'Ground' : floorNumber}
              </SheetDescription>
            </div>
            {mode === 'edit' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" 
                onClick={() => {
                  if(confirm('Are you sure you want to delete this unit?')) onDelete(unit.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden relative z-10">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Primary Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unit_number" className="text-xs font-bold text-slate-500 uppercase">Unit Number *</Label>
                  <Input
                    id="unit_number"
                    value={formData.unit_number}
                    onChange={(e) => setFormData(p => ({ ...p, unit_number: e.target.value }))}
                    placeholder="e.g. 901"
                    className="h-10 bg-white rounded-lg border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="config_id" className="text-xs font-bold text-slate-500 uppercase">Unit Config *</Label>
                  <Select 
                    value={formData.config_id} 
                    onValueChange={handleConfigChange}
                    required
                  >
                    <SelectTrigger className="h-10 bg-white rounded-lg border-slate-200">
                      <SelectValue placeholder="Select Config" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {unitConfigs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.config_name || c.property_type} {c.carpet_area && `(${c.carpet_area} sqft)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status and Facing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-bold text-slate-500 uppercase">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                    <SelectTrigger className={cn("h-10 bg-white rounded-lg border transition-all", getStatusConfig(formData.status).border)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {['available', 'reserved', 'sold', 'blocked', 'under_maintenance'].map(opt => (
                        <SelectItem key={opt} value={opt} className="capitalize py-2">
                           <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", getStatusConfig(opt).dot)} />
                              {opt.replace('_', ' ')}
                           </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="facing" className="text-xs font-bold text-slate-500 uppercase">Facing</Label>
                  <Select value={formData.facing} onValueChange={(v) => setFormData(p => ({ ...p, facing: v }))}>
                    <SelectTrigger className="h-10 bg-white rounded-lg border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {['None', 'North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Pricing and Area */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Pricing Structure (₹)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="base_price" className="text-[10px] text-slate-400 font-bold uppercase">Base</Label>
                      <Input
                        id="base_price"
                        type="number"
                        value={formData.base_price}
                        onChange={(e) => setFormData(p => ({ ...p, base_price: Number(e.target.value) }))}
                        className="h-9 bg-white rounded-lg border-slate-200 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="floor_rise" className="text-[10px] text-slate-400 font-bold uppercase">Floor Rise</Label>
                      <Input
                        id="floor_rise"
                        type="number"
                        value={formData.floor_rise_price}
                        onChange={(e) => setFormData(p => ({ ...p, floor_rise_price: Number(e.target.value) }))}
                        className="h-9 bg-white rounded-lg border-slate-200 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="plc" className="text-[10px] text-slate-400 font-bold uppercase">PLC</Label>
                      <Input
                        id="plc"
                        type="number"
                        value={formData.plc_price}
                        onChange={(e) => setFormData(p => ({ ...p, plc_price: Number(e.target.value) }))}
                        className="h-9 bg-white rounded-lg border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl text-white shadow-lg flex justify-between items-center overflow-hidden relative mt-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                    <div className="relative z-10">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Total Value</span>
                      <p className="text-xl font-black">{formatINR(finalPrice)}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-md relative z-10">
                       <IndianRupee className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Area Configuration (SQFT)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="carpet_area" className="text-[10px] text-slate-400 font-bold uppercase">Carpet</Label>
                      <Input
                        id="carpet_area"
                        type="number"
                        value={projectType === 'land' ? formData.plot_area : formData.carpet_area}
                        onChange={(e) => setFormData(p => ({ ...p, [projectType === 'land' ? 'plot_area' : 'carpet_area']: Number(e.target.value) }))}
                        className="h-9 bg-white rounded-lg border-slate-200 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="built_up" className="text-[10px] text-slate-400 font-bold uppercase">Built-up</Label>
                      <Input
                        id="built_up"
                        type="number"
                        value={formData.built_up_area}
                        onChange={(e) => setFormData(p => ({ ...p, built_up_area: Number(e.target.value) }))}
                        className="h-9 bg-white rounded-lg border-slate-200 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="super_built_up" className="text-[10px] text-slate-400 font-bold uppercase">Super</Label>
                      <Input
                        id="super_built_up"
                        type="number"
                        value={formData.super_built_up_area}
                        onChange={(e) => setFormData(p => ({ ...p, super_built_up_area: Number(e.target.value) }))}
                        className="h-9 bg-white rounded-lg border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Association (Simplified) */}
              <div className="pt-4 border-t border-slate-100">
                 <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Lead Association</Label>
                 <Popover open={openLeadPicker} onOpenChange={setOpenLeadPicker}>
                    <PopoverTrigger asChild>
                       <Button 
                        variant="outline" 
                        className={cn(
                          "w-full justify-between h-10 px-3 bg-slate-50 border-slate-100 rounded-lg hover:bg-slate-100 transition-all",
                          !formData.lead_id && "text-slate-400 font-medium"
                        )}
                       >
                          <div className="flex items-center gap-2">
                             {selectedLead ? (
                                <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{selectedLead.name}</span>
                             ) : (
                                <span className="text-[11px]">Select Lead...</span>
                             )}
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                       </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-2xl border-slate-200" align="start">
                       <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search leads..." 
                            value={leadSearch}
                            onValueChange={setLeadSearch}
                          />
                          <CommandList>
                             <CommandEmpty>No leads found.</CommandEmpty>
                             <CommandGroup>
                                {leads.map((lead) => (
                                   <CommandItem
                                      key={lead.id}
                                      onSelect={() => {
                                         setFormData(p => ({ ...p, lead_id: lead.id }));
                                         setOpenLeadPicker(false);
                                      }}
                                      className="py-2.5"
                                   >
                                      <div className="flex flex-col">
                                         <span className="text-xs font-bold">{lead.name}</span>
                                         <span className="text-[9px] text-slate-500">{lead.phone || lead.email}</span>
                                      </div>
                                   </CommandItem>
                                ))}
                             </CommandGroup>
                          </CommandList>
                       </Command>
                    </PopoverContent>
                 </Popover>
              </div>

            </div>
          </ScrollArea>

          <footer className="p-6 bg-white border-t flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="h-10 flex-1 rounded-lg font-bold text-slate-500">
              Cancel
            </Button>
            <Button type="submit" className="h-10 flex-1 gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold">
              <Save className="w-4 h-4" />
              {mode === 'add' ? 'Add Unit' : 'Save'}
            </Button>
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}
