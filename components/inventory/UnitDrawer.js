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
  UserPlus,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  Sparkles,
  Zap,
  CornerDownRight,
  SunMoon,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
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
  project,
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
    transaction_type: 'sell',
    facing: 'North',
    status: 'available',
    base_price: '',
    floor_rise_price: '',
    plc_price: '',
    carpet_area: '',
    built_up_area: '',
    super_built_up_area: '',
    plot_area: '',
    bedrooms: '',
    bathrooms: '',
    balconies: '',
    is_corner: false,
    is_vastu_compliant: false,
    construction_status: 'under_construction',
    possession_date: '',
    completion_date: '',
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
        transaction_type: unit.transaction_type || unit.config?.transaction_type || 'sell',
        facing: unit.facing || 'North',
        status: unit.status || 'available',
        base_price: unit.base_price || '',
        floor_rise_price: unit.floor_rise_price || '',
        plc_price: unit.plc_price || '',
        carpet_area: unit.carpet_area || '',
        built_up_area: unit.built_up_area || '',
        super_built_up_area: unit.super_built_up_area || '',
        plot_area: unit.plot_area || '',
        bedrooms: unit.bedrooms || '',
        bathrooms: unit.bathrooms || '',
        balconies: unit.balconies || '',
        is_corner: !!unit.is_corner,
        is_vastu_compliant: !!unit.is_vastu_compliant,
        construction_status: unit.construction_status || 'under_construction',
        possession_date: unit.possession_date || '',
        completion_date: unit.completion_date || '',
        lead_id: unit.lead_id || null,
        metadata: unit.metadata || {},
      });
    } else if (mode === 'add' && tower) {
      const normalizeProjectStatus = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('ready') || s.includes('move')) return 'ready_to_move';
        if (s.includes('complete') || s.includes('finished')) return 'completed';
        return 'under_construction';
      };
      
      const generated = generateUnitNumber(tower.name, floorNumber, slotIndex || 0);
      const projectStatus = normalizeProjectStatus(project?.status || project?.metadata?.real_estate?.project?.status);
      setFormData({
        unit_number: generated,
        config_id: '',
        transaction_type: 'sell',
        facing: 'North',
        status: 'available',
        base_price: '',
        floor_rise_price: '',
        plc_price: '',
        carpet_area: '',
        built_up_area: '',
        super_built_up_area: '',
        plot_area: '',
        bedrooms: '',
        bathrooms: '',
        balconies: '',
        is_corner: false,
        is_vastu_compliant: false,
        construction_status: projectStatus,
        possession_date: project?.possession_date || '',
        completion_date: project?.completion_date || '',
        lead_id: null,
        metadata: {
           slot_index: slotIndex
        },
      });
    }
  }, [mode, unit, tower, floorNumber, slotIndex, towerId, open, project]);

  const handleConfigChange = (configId) => {
    const config = unitConfigs.find(c => c.id === configId);
    
    if (config) {
      const bedroomsMatch = config.config_name?.match(/\d+/);
      const extractedBedrooms = bedroomsMatch ? parseInt(bedroomsMatch[0]) : '';
      
      setFormData(prev => ({
        ...prev,
        config_id: configId,
        transaction_type: config.transaction_type || 'sell',
        carpet_area: config.carpet_area || '',
        built_up_area: config.built_up_area || config.builtup_area || '',
        super_built_up_area: config.super_built_up_area || config.super_builtup_area || '',
        plot_area: config.plot_area || '',
        base_price: config.base_price || '',
        bedrooms: extractedBedrooms || prev.bedrooms
      }));
    } else {
      setFormData(prev => ({ ...prev, config_id: configId }));
    }
  };

  const handlePriceFieldChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val === '' ? '' : Number(val) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPrice = calculateFinalPrice(formData.base_price || 0, formData.floor_rise_price || 0, formData.plc_price || 0);
    
    // Clean data for numeric fields before saving
    const numericFields = ['base_price', 'floor_rise_price', 'plc_price', 'carpet_area', 'built_up_area', 'super_built_up_area', 'plot_area', 'bedrooms', 'bathrooms', 'balconies'];
    const cleanedData = { ...formData };
    numericFields.forEach(f => {
      if (cleanedData[f] === '') cleanedData[f] = null;
      else if (cleanedData[f] !== undefined && cleanedData[f] !== null) cleanedData[f] = Number(cleanedData[f]);
    });

    const payload = {
      ...cleanedData,
      total_price: finalPrice,
      tower_id: towerId,
      floor_number: floorNumber,
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

  const finalPrice = calculateFinalPrice(formData.base_price || 0, formData.floor_rise_price || 0, formData.plc_price || 0);
  const selectedConfig = unitConfigs.find(c => c.id === formData.config_id);
  const selectedCategory = selectedConfig?.category || projectType;
  const isResidential = selectedCategory === 'residential';
  const isLand = selectedCategory === 'land';
  const selectedLead = leads.find(l => l.id === formData.lead_id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col border-l shadow-2xl overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <SheetHeader className="p-4 bg-white border-b relative z-10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={cn(
                 "w-10 h-10 rounded-xl flex items-center justify-center shadow-md ring-2 ring-slate-50",
                 getStatusConfig(formData.status).bg,
                 getStatusConfig(formData.status).text
               )}>
                  <Building2 className="w-5 h-5" />
               </div>
               <div>
                 <SheetTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   {mode === 'add' ? 'New Unit' : `${formData.unit_number}`}
                   {selectedConfig && (
                      <Badge variant="outline" className="text-[8px] uppercase font-bold bg-slate-50 border-slate-100 py-0 px-1.5 h-4">
                        {selectedConfig.property_type}
                      </Badge>
                   )}
                 </SheetTitle>
                 <SheetDescription className="text-[10px] text-slate-400 font-semibold leading-none">
                   {tower?.name} • L{floorNumber === 0 ? 'G' : floorNumber}
                 </SheetDescription>
               </div>
            </div>
            <div className="flex items-center gap-1.5">
               {mode === 'edit' && (
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg" 
                   onClick={() => {
                     if(confirm('Are you sure you want to delete this unit?')) onDelete(unit.id);
                   }}
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                 </Button>
               )}
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden relative z-10">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Category & Config Section */}
              <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="unit_number" className="text-[11px] font-bold text-slate-400 uppercase">Unit No *</Label>
                    <Input
                      id="unit_number"
                      value={formData.unit_number || ''}
                      onChange={(e) => setFormData(p => ({ ...p, unit_number: e.target.value }))}
                      placeholder="e.g. 901"
                      className="h-8 bg-slate-50/30 border-slate-100 rounded-lg focus:bg-white transition-all font-bold text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="config_id" className="text-[11px] font-bold text-slate-400 uppercase">Type *</Label>
                    <Select value={formData.config_id || ''} onValueChange={handleConfigChange} required>
                      <SelectTrigger className="h-8 bg-slate-50/30 border-slate-100 rounded-lg focus:bg-white transition-all text-xs font-bold">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                        {unitConfigs.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="py-2 rounded-lg">
                            <div className="flex flex-col items-start justify-start gap-0">
                               <span className="font-semibold text-[10px]">{c.config_name || c.property_type}</span>
                               <span className="text-[8px] text-slate-400 uppercase">{c.property_type} • {c.carpet_area || c.plot_area} sqft</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Transaction</Label>
                    <div className="flex gap-1 bg-slate-100/50 p-0.5 rounded-lg border border-slate-100">
                        {['sell', 'rent'].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, transaction_type: mode }))}
                            className={cn(
                              "flex-1 py-1 rounded-md text-[11px] font-bold uppercase transition-all",
                              formData.transaction_type === mode 
                               ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-100" 
                               : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Status</Label>
                    <Select value={formData.status || ''} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                      <SelectTrigger className={cn("h-8 border-slate-100 rounded-lg bg-slate-50/30 text-[11px] font-bold", getStatusConfig(formData.status).text)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {['available', 'reserved', 'sold', 'blocked', 'under_maintenance'].map(opt => (
                          <SelectItem key={opt} value={opt} className="capitalize py-1.5 focus:bg-slate-50">
                            <div className="flex items-center gap-2 font-bold text-[10px] capitalize">
                                <div className={cn("w-1.5 h-1.5 rounded-full", getStatusConfig(opt).dot)} />
                                {opt.replace('_', ' ')}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-4 shadow-sm">
                 <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <IndianRupee className="w-3 h-3 text-blue-500" /> Commercial
                    </h4>
                    <div className="flex items-center gap-1.5 bg-blue-50/50 px-2 py-0.5 rounded-md border border-blue-100">
                       <span className="text-[8px] font-bold text-blue-400 uppercase">Total Value:</span>
                       <span className="text-[10px] font-bold text-blue-600">{formatINR(finalPrice)}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'base_price', label: 'Base', value: formData.base_price },
                      { id: 'floor_rise_price', label: 'Raise', value: formData.floor_rise_price },
                      { id: 'plc_price', label: 'PLC', value: formData.plc_price }
                    ].map((field) => (
                      <div key={field.id} className="space-y-1">
                        <div className="flex justify-between items-center px-0.5">
                           <Label htmlFor={field.id} className="text-[11px] font-bold text-slate-400 uppercase">{field.label}</Label>
                           {field.value > 0 && (
                             <span className="text-[9px] font-bold text-blue-500">{formatINR(field.value)}</span>
                           )}
                        </div>
                        <Input
                          id={field.id}
                          type="number"
                          placeholder="0"
                          value={field.value}
                          onChange={(e) => handlePriceFieldChange(field.id, e.target.value)}
                          className="h-8 bg-slate-50/10 border-slate-100 rounded-lg text-xs font-bold focus:bg-white px-2"
                        />
                      </div>
                    ))}
                 </div>
              </div>

              {/* Specific Attributes */}
              <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-4 shadow-sm">
                 <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                   <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                     <Sparkles className="w-3 h-3 text-amber-500" /> Physicals
                   </h4>
                   <Badge variant="outline" className="text-[9px] font-bold tracking-wider uppercase text-slate-400 bg-slate-50/50 border-slate-50 px-1.5 h-3.5">
                     {selectedCategory}
                   </Badge>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="facing" className="text-[11px] font-bold text-slate-400 uppercase">Facing</Label>
                        <Select value={formData.facing || 'North'} onValueChange={(v) => setFormData(p => ({ ...p, facing: v }))}>
                          <SelectTrigger className="h-8 bg-slate-50/10 border-slate-100 rounded-lg font-semibold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {['None', 'North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map(opt => (
                              <SelectItem key={opt} value={opt} className="font-semibold text-xs">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="construction_status" className="text-[11px] font-bold text-slate-400 uppercase">Construction Status</Label>
                        <Select value={formData.construction_status || 'under_construction'} onValueChange={(v) => setFormData(p => ({ ...p, construction_status: v }))}>
                          <SelectTrigger className="h-8 bg-slate-50/10 border-slate-100 rounded-lg font-semibold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="under_construction" className="font-semibold text-xs">Under Construction</SelectItem>
                            <SelectItem value="ready_to_move" className="font-semibold text-xs">Ready to Move</SelectItem>
                            <SelectItem value="completed" className="font-semibold text-xs">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase">
                           {formData.construction_status === 'under_construction' ? 'Expected Possession' : 'Completion Date'}
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-8 px-2 justify-start text-left font-semibold text-xs bg-slate-50/10 border-slate-100 rounded-lg",
                                !formData.possession_date && !formData.completion_date && "text-slate-400"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {formData.construction_status === 'under_construction' 
                                ? (formData.possession_date ? format(new Date(formData.possession_date), "PPP") : <span className="text-xs">Pick date</span>)
                                : (formData.completion_date ? format(new Date(formData.completion_date), "PPP") : <span className="text-xs">Pick date</span>)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-slate-100" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.construction_status === 'under_construction' 
                                ? (formData.possession_date ? new Date(formData.possession_date) : undefined)
                                : (formData.completion_date ? new Date(formData.completion_date) : undefined)}
                              onSelect={(date) => {
                                 const iso = date ? date.toISOString().split('T')[0] : '';
                                 setFormData(p => ({ ...p, [p.construction_status === 'under_construction' ? 'possession_date' : 'completion_date']: iso }));
                              }}
                              initialFocus
                              className="rounded-2xl"
                            />
                          </PopoverContent>
                        </Popover>
                    </div>
                 </div>

                 {isResidential && (
                    <div className="space-y-4 pt-1">
                       <div className="grid grid-cols-3 gap-6">
                          {[
                            { id: 'bedrooms', label: 'Bedrooms', placeholder: '2' },
                            { id: 'bathrooms', label: 'Bathrooms', placeholder: '2' },
                            { id: 'balconies', label: 'Balconies', placeholder: '1' }
                          ].map(f => (
                            <div key={f.id} className="space-y-1">
                               <Label className="text-[11px] font-bold text-slate-400 uppercase">{f.label}</Label>
                               <Input 
                                 type="number"
                                 placeholder={f.placeholder}
                                 value={formData[f.id] || ''}
                                 onChange={(e) => setFormData(p => ({ ...p, [f.id]: e.target.value }))}
                                 className="h-8 bg-slate-50/10 border-slate-100 rounded-lg text-xs font-bold px-1 placeholder:text-slate-300"
                               />
                            </div>
                          ))}
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div 
                            onClick={() => setFormData(p => ({ ...p, is_corner: !p.is_corner }))}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-400/10 group/corner",
                              formData.is_corner ? "bg-blue-50/50 border-blue-200" : "bg-slate-50/30 border-slate-100"
                            )}
                          >
                             <div className="flex items-center gap-2">
                                <CornerDownRight className={cn("w-3 h-3 group-hover/corner:scale-110 transition-transform", formData.is_corner ? "text-blue-600" : "text-slate-300")} />
                                <span className={cn("text-[11px] font-bold uppercase", formData.is_corner ? "text-blue-600" : "text-slate-400")}>Corner</span>
                             </div>
                             {formData.is_corner && <Check className="w-3 h-3 text-blue-600" />}
                          </div>
                          <div 
                            onClick={() => setFormData(p => ({ ...p, is_vastu_compliant: !p.is_vastu_compliant }))}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer hover:border-amber-400 hover:bg-amber-400/10 group/vastu",
                              formData.is_vastu_compliant ? "bg-amber-50/50 border-amber-200" : "bg-slate-50/30 border-slate-100"
                            )}
                          >
                             <div className="flex items-center gap-2">
                                <SunMoon className={cn("w-3.5 h-3.5 group-hover/vastu:rotate-12 transition-transform", formData.is_vastu_compliant ? "text-amber-600" : "text-slate-300")} />
                                <span className={cn("text-[11px] font-bold uppercase", formData.is_vastu_compliant ? "text-amber-600" : "text-slate-400")}>Vastu</span>
                             </div>
                             {formData.is_vastu_compliant && <Check className="w-3 h-3 text-amber-600" />}
                          </div>
                       </div>

                       <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'carpet_area', label: 'Carpet' },
                            { id: 'built_up_area', label: 'Built-up' },
                            { id: 'super_built_up_area', label: 'Super Built-up' }
                          ].map(f => (
                            <div key={f.id} className="space-y-1">
                               <Label className="text-[11px] font-bold text-slate-400 uppercase">{f.label}</Label>
                               <Input 
                                 type="number"
                                 placeholder="0"
                                 value={formData[f.id] || ''}
                                 onChange={(e) => setFormData(p => ({ ...p, [f.id]: e.target.value }))}
                                 className="h-8 bg-slate-50/10 border-slate-100 rounded-lg text-xs font-bold px-2 placeholder:text-slate-300"
                               />
                            </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {isLand && (
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-400 uppercase">Plot Area (SQFT)</Label>
                          <Input 
                            type="number"
                            value={formData.plot_area || ''}
                            onChange={(e) => setFormData(p => ({ ...p, plot_area: e.target.value }))}
                            className="h-8 bg-slate-50/10 border-slate-100 rounded-lg text-xs font-bold px-2 placeholder:text-slate-300"
                          />
                       </div>
                    </div>
                 )}
              </div>

              {/* Lead Interaction Section */}
              <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm group">
                 <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <User className="w-3 h-3 text-emerald-500" /> Buyer
                    </h4>
                    {selectedLead && (
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, lead_id: null })); }}
                       >
                          <Trash2 className="w-3 h-3" />
                       </Button>
                    )}
                 </div>

                 <Popover open={openLeadPicker} onOpenChange={setOpenLeadPicker}>
                    <PopoverTrigger asChild>
                       <div className={cn(
                         "w-full cursor-pointer flex items-center justify-between p-2 rounded-lg border transition-all",
                         selectedLead 
                          ? "bg-emerald-50/30 border-emerald-100" 
                          : "bg-slate-50/30 border-slate-50 hover:bg-slate-50 active:scale-[0.98]"
                       )}>
                          <div className="flex items-center gap-2.5">
                             <div className={cn(
                               "w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm",
                               selectedLead ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                             )}>
                                {selectedLead ? <User className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                             </div>
                             <div>
                                {selectedLead ? (
                                   <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-900 leading-tight">{selectedLead.name}</span>
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-tight">{selectedLead.phone || 'No Phone'}</span>
                                   </div>
                                ) : (
                                   <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-400 leading-tight">Assign Buyer</span>
                                      <span className="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">Search CRM...</span>
                                   </div>
                                )}
                             </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-300 transition-transform" />
                       </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="start">
                       <Command shouldFilter={false}>
                          <div className="flex items-center border-b px-2">
                             <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40 text-slate-900" />
                             <CommandInput 
                               placeholder="Find buyer..." 
                               value={leadSearch}
                               onValueChange={setLeadSearch}
                               className="h-10 border-none focus:ring-0 text-[11px] font-bold"
                             />
                          </div>
                          <CommandList className="max-h-[200px] custom-scrollbar">
                             <CommandEmpty className="p-8 text-center text-slate-300 font-bold text-[9px] uppercase">
                                No records found.
                             </CommandEmpty>
                             <CommandGroup className="p-2">
                                {leads.map((lead) => (
                                   <CommandItem
                                      key={lead.id}
                                      onSelect={() => {
                                         setFormData(p => ({ ...p, lead_id: lead.id }));
                                         setOpenLeadPicker(false);
                                      }}
                                      className="rounded-lg py-2 hover:bg-slate-50 mb-0.5"
                                   >
                                      <div className="flex items-center gap-2.5">
                                         <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                            <span className="text-[9px] font-bold uppercase">{lead.name[0]}</span>
                                         </div>
                                         <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-800">{lead.name}</span>
                                            <span className="text-[8px] text-slate-400">{lead.phone || lead.email}</span>
                                         </div>
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

          <footer className="p-4 bg-white border-t flex gap-2.5 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 flex-1 rounded-xl font-bold text-slate-500 text-xs">
              Cancel
            </Button>
            <Button type="submit" className="h-9 flex-1 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs">
              <Save className="w-3.5 h-3.5" />
              {mode === 'add' ? 'Confirm' : 'Update'}
            </Button>
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}
