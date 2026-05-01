'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Building2, Save, Trash2, LayoutGrid, Layers, FlipHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { autoNameTower } from '@/lib/inventory';
import { cn } from '@/lib/utils';

export default function TowerDrawer({
  open,
  onClose,
  mode = 'add',
  tower,
  projectId,
  organizationId,
  existingTowers = [],
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState({
    name: '',
    total_floors: '',
    units_per_floor: '',
    description: '',
    order_index: 0,
    has_ground_floor: true,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const nameExists = existingTowers.some(t => 
    t.name?.toLowerCase().trim() === formData.name?.toLowerCase().trim() && 
    t.id !== tower?.id
  );

  useEffect(() => {
    if (mode === 'edit' && tower) {
      setFormData({
        name: tower.name || '',
        total_floors: tower.total_floors || '',
        units_per_floor: tower.units_per_floor || '',
        description: tower.description || '',
        order_index: tower.order_index || 0,
        has_ground_floor: tower.metadata?.has_ground_floor ?? true,
      });
    } else if (mode === 'add') {
      const defaultName = autoNameTower(existingTowers || []);
      setFormData({
        name: defaultName,
        total_floors: 10,
        units_per_floor: 4,
        description: '',
        order_index: existingTowers.length,
        has_ground_floor: true,
      });
    }
  }, [mode, tower, existingTowers, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nameExists) return;

    try {
      const { has_ground_floor, ...rest } = formData;
      await onSave({
        ...rest,
        total_floors: Number(formData.total_floors),
        units_per_floor: Number(formData.units_per_floor),
        project_id: projectId,
        organization_id: organizationId,
        metadata: { has_ground_floor: formData.has_ground_floor },
      });
      onClose();
    } catch (error) {
      console.error('Error saving tower:', error);
    }
  };

  const isValid = 
     formData.name?.trim() && 
     !nameExists &&
     Number(formData.total_floors) > 0 && 
     Number(formData.units_per_floor) > 0;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col border-l shadow-2xl bg-slate-50">
        <SheetHeader className="p-6 bg-white border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-slate-900">
              {mode === 'add' ? 'Add New Tower' : 'Edit Tower Settings'}
            </SheetTitle>
            {mode === 'edit' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-red-600 hover:bg-red-50" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <Label htmlFor="tower_name" className="text-xs font-bold text-slate-500 uppercase">Tower Name</Label>
                   {nameExists && (
                      <span className="text-[10px] font-bold text-red-500 animate-pulse">Name already exists</span>
                   )}
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="tower_name"
                    className={cn(
                       "pl-9 h-11 bg-white rounded-lg border-slate-200 shadow-sm",
                       nameExists && "border-red-500 ring-1 ring-red-50"
                    )}
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Tower A, Block 1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_floors" className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" /> Total Floors
                  </Label>
                  <Input
                    id="total_floors"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="10"
                    className="h-11 bg-white rounded-lg border-slate-200 shadow-sm"
                    value={formData.total_floors}
                    onChange={(e) => setFormData(p => ({ ...p, total_floors: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="units_per_floor" className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-slate-400" /> Units Per Floor
                  </Label>
                  <Input
                    id="units_per_floor"
                    type="number"
                    min="1"
                    placeholder="4"
                    className="h-11 bg-white rounded-lg border-slate-200 shadow-sm"
                    value={formData.units_per_floor}
                    onChange={(e) => setFormData(p => ({ ...p, units_per_floor: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Ground Floor Toggle */}
              <div className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                formData.has_ground_floor
                  ? "bg-slate-900 border-slate-900"
                  : "bg-white border-slate-200"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    formData.has_ground_floor ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={cn("text-xs font-bold", formData.has_ground_floor ? "text-white" : "text-slate-700")}>
                      Includes Ground Floor
                    </p>
                    <p className={cn("text-[10px] font-medium mt-0.5", formData.has_ground_floor ? "text-slate-300" : "text-slate-400")}>
                      {formData.has_ground_floor ? 'Floor G (0) will appear at the bottom' : 'Grid starts from Floor 1'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.has_ground_floor}
                  onCheckedChange={(v) => setFormData(p => ({ ...p, has_ground_floor: v }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tower_desc" className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</Label>
                <Textarea
                  id="tower_desc"
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Additional details about this tower..."
                  className="min-h-[100px] bg-white rounded-lg border-slate-200 shadow-sm"
                />
              </div>

            </div>

            <Separator className="bg-slate-100" />
            
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex gap-4 text-sm text-blue-700 shadow-sm">
               <div className="p-2 bg-white rounded-xl h-fit shrink-0 shadow-sm">
                  <Layers className="w-5 h-5 text-blue-500" />
               </div>
               <div>
                 <p className="font-bold text-blue-900 mb-1">Tower Initialization Ready</p>
                 <p className="opacity-80 text-xs leading-relaxed">Defining this structure will generate a mapping for {(formData.has_ground_floor ? Number(formData.total_floors) + 1 : Number(formData.total_floors)) * formData.units_per_floor} unique unit slots. <span className="font-bold text-blue-600">You can add units on any floor later.</span></p>
               </div>
            </div>
          </div>

          <SheetFooter className="p-6 border-t bg-white gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-lg font-bold text-slate-500">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid}
              className="h-11 flex-1 gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {mode === 'add' ? 'Create Tower' : 'Save'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-slate-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              This will permanently delete <span className="font-bold text-slate-900">{tower?.name}</span> and all units associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-slate-200 text-slate-500 font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDelete(tower.id)}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Delete Tower
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
