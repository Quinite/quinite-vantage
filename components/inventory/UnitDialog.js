'use client'

import { useState, useEffect } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { calculateFinalPrice, generateUnitNumber, getStatusConfig } from '@/lib/inventory'
import { toast } from 'react-hot-toast'
import { Trash2, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

import IdentitySection from './unit-dialog/IdentitySection'
import PricingSection from './unit-dialog/PricingSection'
import ConstructionSection from './unit-dialog/ConstructionSection'
import SiteVisitsPanel from './unit-dialog/SiteVisitsPanel'

const EMPTY_FORM = {
  unit_number: '',
  config_id: '',
  transaction_type: 'sell',
  facing: 'North',
  status: 'available',
  base_price: null,
  floor_rise_price: null,
  plc_price: null,
  carpet_area: null,
  built_up_area: null,
  super_built_up_area: null,
  plot_area: null,
  bedrooms: null,
  bathrooms: null,
  balconies: null,
  is_corner: false,
  is_vastu_compliant: false,
  construction_status: 'under_construction',
  possession_date: null,
  completion_date: null,
  lead_id: null,
  amenities: null,
  metadata: {},
}

function normalizeProjectStatus(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('ready') || s.includes('move')) return 'ready_to_move'
  if (s.includes('complete') || s.includes('finished')) return 'completed'
  return 'under_construction'
}

export default function UnitDialog({
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
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) { setActiveTab('details'); setConfirmDelete(false); return }

    if (mode === 'edit' && unit) {
      setFormData({
        unit_number: unit.unit_number || '',
        config_id: unit.config_id || '',
        transaction_type: unit.transaction_type || 'sell',
        facing: unit.facing || 'North',
        status: unit.status || 'available',
        base_price: unit.base_price ?? null,
        floor_rise_price: unit.floor_rise_price ?? null,
        plc_price: unit.plc_price ?? null,
        carpet_area: unit.carpet_area ?? null,
        built_up_area: unit.built_up_area ?? null,
        super_built_up_area: unit.super_built_up_area ?? null,
        plot_area: unit.plot_area ?? null,
        bedrooms: unit.bedrooms ?? null,
        bathrooms: unit.bathrooms ?? null,
        balconies: unit.balconies ?? null,
        is_corner: unit.is_corner || false,
        is_vastu_compliant: unit.is_vastu_compliant || false,
        construction_status: unit.construction_status || 'under_construction',
        possession_date: unit.possession_date || null,
        completion_date: unit.completion_date || null,
        lead_id: unit.lead_id || null,
        amenities: unit.amenities ?? null,
        metadata: unit.metadata || {},
      })
    } else {
      const generated = tower ? generateUnitNumber(tower.name, floorNumber, slotIndex || 0) : ''
      const projectStatus = normalizeProjectStatus(project?.status)
      setFormData({
        ...EMPTY_FORM,
        unit_number: generated,
        construction_status: projectStatus,
        possession_date: project?.possession_date || null,
        completion_date: project?.completion_date || null,
        metadata: { slot_index: slotIndex },
      })
    }
  }, [open, mode, unit, tower, floorNumber, slotIndex, project])

  const handleConfigChange = (configId) => {
    const config = unitConfigs.find(c => c.id === configId)
    if (config) {
      const bedroomsMatch = config.config_name?.match(/\d+/)
      const extractedBedrooms = bedroomsMatch ? parseInt(bedroomsMatch[0]) : null
      setFormData(prev => ({
        ...prev,
        config_id: configId,
        transaction_type: config.transaction_type || prev.transaction_type,
        carpet_area: config.carpet_area ?? prev.carpet_area,
        built_up_area: config.built_up_area ?? config.builtup_area ?? prev.built_up_area,
        super_built_up_area: config.super_built_up_area ?? config.super_builtup_area ?? prev.super_built_up_area,
        plot_area: config.plot_area ?? prev.plot_area,
        base_price: config.base_price ?? prev.base_price,
        bedrooms: extractedBedrooms ?? prev.bedrooms,
      }))
    } else {
      setFormData(prev => ({ ...prev, config_id: configId }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.unit_number || !formData.config_id) {
      toast.error('Unit number and config are required')
      return
    }
    const finalPrice = calculateFinalPrice(formData.base_price || 0, formData.floor_rise_price || 0, formData.plc_price || 0)
    const numericFields = ['base_price', 'floor_rise_price', 'plc_price', 'carpet_area', 'built_up_area', 'super_built_up_area', 'plot_area', 'bedrooms', 'bathrooms', 'balconies']
    const cleaned = { ...formData }
    // strip internal cache keys
    delete cleaned._lead_name
    delete cleaned._lead_phone
    numericFields.forEach(f => {
      if (cleaned[f] === '' || cleaned[f] === undefined) cleaned[f] = null
      else if (cleaned[f] !== null) cleaned[f] = Number(cleaned[f])
    })
    const payload = {
      ...cleaned,
      total_price: finalPrice,
      tower_id: towerId,
      floor_number: floorNumber,
      project_id: projectId,
      organization_id: organizationId,
    }
    setSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save unit')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await onDelete(unit.id)
      onClose()
    } catch {
      toast.error('Failed to delete unit')
    }
  }

  const selectedConfig = unitConfigs.find(c => c.id === formData.config_id)
  const selectedCategory = selectedConfig?.category || projectType
  const isResidential = selectedCategory === 'residential'
  const isLand = selectedCategory === 'land'
  const finalPrice = calculateFinalPrice(formData.base_price || 0, formData.floor_rise_price || 0, formData.plc_price || 0)
  const statusCfg = getStatusConfig(formData.status)

  const siteVisitCount = 0 // will be populated by panel itself; badge is informational

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[840px] flex flex-col rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ maxHeight: '92vh' }}
        >
          {/* ── Header ── */}
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden flex-shrink-0">
            <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -top-6 right-24 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

            <div className="relative px-6 pt-5 pb-5">
              <div className="flex items-center justify-between gap-4">
                {/* Left: icon + name + meta */}
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-lg shadow-lg shadow-blue-900/30 flex-shrink-0">
                    🏠
                  </div>
                  <div>
                    <h2 className="text-[17px] font-extrabold text-white leading-tight tracking-tight">
                      {mode === 'add' ? 'New Unit' : (formData.unit_number || 'Edit Unit')}
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {[
                        tower?.name,
                        floorNumber !== undefined && `Floor ${floorNumber === 0 ? 'G' : floorNumber}`,
                        selectedConfig && (selectedConfig.config_name || selectedConfig.property_type),
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                {/* Close */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs — inside header, flush to bottom */}
            <div className="px-6 flex items-end gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  'px-4 py-2 text-[12px] font-semibold rounded-t-lg transition-all',
                  activeTab === 'details'
                    ? 'bg-slate-50 text-slate-800'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                )}
              >
                Unit Details
              </button>

              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('visits')}
                  className={cn(
                    'px-4 py-2 text-[12px] font-semibold rounded-t-lg transition-all',
                    activeTab === 'visits'
                      ? 'bg-slate-50 text-slate-800'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  )}
                >
                  Site Visits
                </button>
              )}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-slate-50">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeTab === 'details' ? (
                <>
                  <IdentitySection
                    formData={formData}
                    setFormData={setFormData}
                    unitConfigs={unitConfigs}
                    onConfigChange={handleConfigChange}
                    selectedConfig={selectedConfig}
                  />
                  <PricingSection
                    formData={formData}
                    setFormData={setFormData}
                    isResidential={isResidential}
                    isLand={isLand}
                    finalPrice={finalPrice}
                    selectedConfig={selectedConfig}
                  />
                  <ConstructionSection
                    formData={formData}
                    setFormData={setFormData}
                  />
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm min-h-[300px]">
                  <SiteVisitsPanel unit={unit} project={project} />
                </div>
              )}
            </div>

            {/* ── Fixed footer ── */}
            <div className="flex-shrink-0 bg-white border-t border-slate-100 px-6 py-3.5 flex items-center justify-between">
              <div>
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className={cn(
                      'h-9 px-4 rounded-lg border text-xs font-bold transition-all',
                      confirmDelete
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
                    {confirmDelete ? 'Confirm Delete' : 'Delete Unit'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg font-bold text-slate-500 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving…' : mode === 'add' ? 'Create Unit' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
