'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Building2, Save, Trash2, LayoutGrid, Layers } from 'lucide-react';
import { autoNameTower } from '@/lib/inventory';

export default function TowerDrawer({
  open,
  onClose,
  mode = 'add',
  tower,
  projectId,
  organizationId,
  existingTowerCount = 0,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState({
    name: '',
    total_floors: 10,
    units_per_floor: 4,
    description: '',
    order_index: existingTowerCount,
  });

  useEffect(() => {
    if (mode === 'edit' && tower) {
      setFormData({
        name: tower.name || '',
        total_floors: tower.total_floors || 10,
        units_per_floor: tower.units_per_floor || 4,
        description: tower.description || '',
        order_index: tower.order_index || 0,
      });
    } else if (mode === 'add') {
      const defaultName = autoNameTower(Array(existingTowerCount).fill({}));
      setFormData({
        name: defaultName,
        total_floors: 10,
        units_per_floor: 4,
        description: '',
        order_index: existingTowerCount,
      });
    }
  }, [mode, tower, existingTowerCount, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave({
        ...formData,
        project_id: projectId,
        organization_id: organizationId
      });
      onClose();
    } catch (error) {
      console.error('Error saving tower:', error);
    }
  };

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
                onClick={() => {
                  if(confirm('Are you sure you want to delete this tower and all its units?')) onDelete(tower.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tower_name" className="text-xs font-bold text-slate-500 uppercase">Tower Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="tower_name"
                    className="pl-9 h-11 bg-white rounded-lg border-slate-200 shadow-sm"
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
                    className="h-11 bg-white rounded-lg border-slate-200 shadow-sm"
                    value={formData.total_floors}
                    onChange={(e) => setFormData(p => ({ ...p, total_floors: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="units_per_floor" className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-slate-400" /> Units Per F
                  </Label>
                  <Input
                    id="units_per_floor"
                    type="number"
                    min="1"
                    max="20"
                    className="h-11 bg-white rounded-lg border-slate-200 shadow-sm"
                    value={formData.units_per_floor}
                    onChange={(e) => setFormData(p => ({ ...p, units_per_floor: Number(e.target.value) }))}
                    required
                  />
                </div>
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
                 <p className="font-bold text-blue-900 mb-1">Matrix Initialization Ready</p>
                 <p className="opacity-80 text-xs leading-relaxed">Defining this tower will generate a coordinate mapping for {formData.total_floors * formData.units_per_floor} unique unit slots across {formData.total_floors} levels.</p>
               </div>
            </div>
          </div>

          <SheetFooter className="p-6 border-t bg-white gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-lg font-bold text-slate-500">
              Cancel
            </Button>
            <Button type="submit" className="h-11 flex-1 gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100">
              <Save className="w-4 h-4" />
              {mode === 'add' ? 'Create Tower' : 'Save'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
