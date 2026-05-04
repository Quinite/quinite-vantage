'use client'

import { useState, useEffect, useCallback } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { calculateFinalPrice, generateUnitNumber, getStatusConfig } from '@/lib/inventory'
import { toast } from 'react-hot-toast'
import { Trash2, X, MapPin, Home, Layout, ClipboardList, CalendarDays, UserCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

import IdentitySection from './unit-dialog/IdentitySection'
import PricingSection from './unit-dialog/PricingSection'
import ConstructionSection from './unit-dialog/ConstructionSection'
import SiteVisitsPanel from './unit-dialog/SiteVisitsPanel'
import UnitDealsPanel from './unit-dialog/UnitDealsPanel'
import { useUnitDeals } from '@/hooks/useUnitDeals'
import { createClient } from '@/lib/supabase/client'

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
  price_undisclosed: false,
  construction_status: 'under_construction',
  possession_date: null,
  completion_date: null,
  lead_id: null,
  amenities: null,
  metadata: {},
}

function normalizeProjectStatus(status) {
  const s = (status || '').toLowerCase()
  if (s === 'ready_to_move' || s.includes('ready') || s.includes('move')) return 'ready_to_move'
  if (s === 'completed' || s.includes('complete') || s.includes('finished')) return 'completed'
  // Planning or anything else defaults to under_construction for the unit
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
  existingUnitNumbers = [],
}) {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Tower/floor picker — only used when mode==='add' and no towerId prop supplied
  const needsTowerPicker = mode === 'add' && !towerId
  const [towers, setTowers] = useState([])
  const [towersLoading, setTowersLoading] = useState(false) // used in JSX below
  const [pickedTowerId, setPickedTowerId] = useState('')
  const [pickedFloor, setPickedFloor] = useState('')

  useEffect(() => {
    if (!open || !needsTowerPicker || !projectId) return
    setPickedTowerId(''); setPickedFloor('')
    setTowersLoading(true)
    createClient()
      .from('towers')
      .select('id, name, total_floors, units_per_floor')
      .eq('project_id', projectId)
      .order('order_index')
      .then(({ data }) => { setTowers(data || []); setTowersLoading(false) })
  }, [open, needsTowerPicker, projectId])

  // Auto-regenerate unit number when tower or floor changes
  useEffect(() => {
    if (!needsTowerPicker) return
    const t = towers.find(t => t.id === pickedTowerId)
    const floor = parseInt(pickedFloor)
    if (t && !isNaN(floor)) {
      setFormData(prev => ({ ...prev, unit_number: generateUnitNumber(t.name, floor, 0) }))
    } else {
      setFormData(prev => ({ ...prev, unit_number: '' }))
    }
  }, [pickedTowerId, pickedFloor, towers, needsTowerPicker])

  const { data: dealsData } = useUnitDeals(unit?.id)
  const activeDeal = dealsData?.deals?.find(d => d.status === 'reserved' || d.status === 'won')
  const dealLeadName = activeDeal?.lead?.name
  const dealLeadId = activeDeal?.lead?.id

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
        price_undisclosed: unit.price_undisclosed || false,
        construction_status: unit.construction_status || 'under_construction',
        possession_date: unit.possession_date || null,
        completion_date: unit.completion_date || null,
        lead_id: unit.lead_id || null,
        amenities: unit.amenities ?? null,
        metadata: unit.metadata || {},
      })
    } else {
      const generated = tower ? generateUnitNumber(tower.name, floorNumber, slotIndex || 0) : ''
      const pStatus = project?.status || project?.project_status || ''
      const projectStatus = normalizeProjectStatus(pStatus)
      const projectPossession = project?.possession_date || null
      const projectCompletion = project?.completion_date || null
      
      console.log('[UnitDialog] project detected:', {
        hasProject: !!project,
        pStatus,
        projectStatus,
        projectPossession,
        projectCompletion,
        projectKeys: project ? Object.keys(project) : []
      })

      setFormData({
        ...EMPTY_FORM,
        unit_number: generated,
        construction_status: projectStatus,
        // If ready/complete, we prefer completion_date, otherwise possession_date
        possession_date: projectPossession,
        completion_date: projectCompletion || (['ready_to_move', 'completed'].includes(projectStatus) ? projectPossession : null),
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

    const takenNumbers = mode === 'edit' && unit?.unit_number
      ? existingUnitNumbers.filter(n => n?.toLowerCase() !== unit.unit_number.toLowerCase())
      : existingUnitNumbers
    if (takenNumbers.some(n => n?.trim().toLowerCase() === formData.unit_number.trim().toLowerCase())) {
      toast.error('Unit number already exists — please choose a different one')
      return
    }

    // For tower units added via picker, require tower + floor selection
    const isLandOrVilla = ['land', 'villa'].includes(selectedConfig?.category) || selectedConfig?.property_type === 'Villa'
    const resolvedTowerId = needsTowerPicker ? (isLandOrVilla ? null : pickedTowerId || null) : towerId
    const resolvedFloor   = needsTowerPicker ? (isLandOrVilla ? null : (pickedFloor !== '' ? parseInt(pickedFloor) : null)) : floorNumber
    if (needsTowerPicker && !isLandOrVilla && !resolvedTowerId) {
      toast.error('Please select a tower')
      return
    }
    if (needsTowerPicker && !isLandOrVilla && resolvedFloor === null) {
      toast.error('Please select a floor')
      return
    }

    const finalPrice = calculateFinalPrice(formData.base_price || 0, formData.floor_rise_price || 0, formData.plc_price || 0)
    const numericFields = ['base_price', 'floor_rise_price', 'plc_price', 'carpet_area', 'built_up_area', 'super_built_up_area', 'plot_area', 'bedrooms', 'bathrooms', 'balconies']
    const cleaned = { ...formData }
    delete cleaned._lead_name
    delete cleaned._lead_phone
    numericFields.forEach(f => {
      if (cleaned[f] === '' || cleaned[f] === undefined) cleaned[f] = null
      else if (cleaned[f] !== null) cleaned[f] = Number(cleaned[f])
    })
    const payload = {
      ...cleaned,
      total_price: finalPrice,
      tower_id: resolvedTowerId,
      floor_number: resolvedFloor,
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
  const isApartment = selectedConfig?.property_type === 'Apartment'
  const finalPrice = calculateFinalPrice(formData.base_price || 0, formData.floor_rise_price || 0, formData.plc_price || 0)
  const statusCfg = getStatusConfig(formData.status)

  const isLandOrVilla = selectedConfig?.category === 'land' || selectedConfig?.property_type === 'Villa'
  const towerPickerComplete = !needsTowerPicker || isLandOrVilla || (!!pickedTowerId && pickedFloor !== '')
  const canSubmit = !!formData.unit_number && !!formData.config_id && towerPickerComplete

  const siteVisitCount = 0 // will be populated by panel itself; badge is informational

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[840px] min-h-[640px] flex flex-col rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ maxHeight: '92vh', minHeight: '640px' }}
          onPointerDownOutside={(e) => { if (e.target.closest('[role="dialog"]')) e.preventDefault() }}
          onInteractOutside={(e) => { if (e.target.closest('[role="dialog"]')) e.preventDefault() }}
        >
          <DialogPrimitive.Title className="sr-only">
            {mode === 'add' ? 'Add New Unit' : `Edit Unit ${formData.unit_number || ''}`}
          </DialogPrimitive.Title>
          {/* ── Header ── */}
          <div className="relative bg-white border-b border-slate-200/60 px-6 pt-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-5">
              {/* Left: icon + name + meta */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm shrink-0">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight tracking-tight">
                      {mode === 'add' ? 'New Unit' : (formData.unit_number || 'Edit Unit')}
                    </h2>
                    {mode === 'edit' && statusCfg && (
                      <Badge className={cn("px-2 py-0.5 font-bold text-[9px] uppercase tracking-widest border shadow-none", statusCfg.bg, statusCfg.text, statusCfg.border)}>
                        {statusCfg.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {tower?.name || 'Project'}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs font-semibold text-slate-500">
                      Floor {floorNumber === 0 ? 'G' : floorNumber}
                    </span>
                    {selectedConfig && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-xs font-semibold text-slate-500">
                          {selectedConfig.config_name || selectedConfig.property_type}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  'flex items-center gap-2 pb-4 text-[13px] font-bold transition-all relative',
                  activeTab === 'details'
                    ? 'text-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <Layout className="w-4 h-4" />
                Unit Details
                {activeTab === 'details' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>

              {mode === 'edit' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deals')}
                    className={cn(
                      'flex items-center gap-2 pb-4 text-[13px] font-bold transition-all relative',
                      activeTab === 'deals'
                        ? 'text-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Deals
                    {activeTab === 'deals' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('visits')}
                    className={cn(
                      'flex items-center gap-2 pb-4 text-[13px] font-bold transition-all relative',
                      activeTab === 'visits'
                        ? 'text-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Site Visits
                    {activeTab === 'visits' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-slate-50">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeTab === 'details' ? (
                <>
                  {(formData.status === 'reserved' || formData.status === 'sold') && (() => {
                    const isSold = formData.status === 'sold'
                    const theme = isSold 
                      ? { bg: 'bg-emerald-50/80', border: 'border-emerald-200', text: 'text-emerald-900', sub: 'text-emerald-700/90', icon: 'text-emerald-600', iconBg: 'bg-white border-emerald-100', hover: 'hover:text-emerald-900' }
                      : { bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-900', sub: 'text-amber-700/90', icon: 'text-amber-600', iconBg: 'bg-white border-amber-100', hover: 'hover:text-amber-900' }
                    
                    return (
                      <div className={cn("rounded-2xl p-4 flex gap-3.5 shadow-sm mb-2 border", theme.bg, theme.border)}>
                        <div className={cn("w-10 h-10 rounded-xl shadow-sm flex items-center justify-center shrink-0 border", theme.iconBg)}>
                          <UserCheck className={cn("w-5 h-5", theme.icon)} />
                        </div>
                        <div className="flex flex-col justify-center">
                          <h4 className={cn("text-[13px] font-bold leading-tight flex items-center gap-1.5 flex-wrap", theme.text)}>
                            <span>Unit is {isSold ? 'Sold' : 'Reserved'}</span>
                            {dealLeadName && dealLeadId ? (
                              <span className="flex items-center gap-1">
                                {isSold ? 'to' : 'by'} 
                                <Link 
                                  href={`/dashboard/admin/crm/leads/${dealLeadId}`} 
                                  target="_blank"
                                  className="underline decoration-current/40 hover:decoration-current transition-all inline-flex items-center gap-0.5"
                                >
                                  {dealLeadName}
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </Link>
                              </span>
                            ) : dealLeadName ? (
                              <span>{isSold ? `to ${dealLeadName}` : `by ${dealLeadName}`}</span>
                            ) : null}
                          </h4>
                          <p className={cn("text-[12px] mt-0.5 leading-snug", theme.sub)}>
                            Buyer and transaction details are managed exclusively through the <span className={cn("font-bold underline cursor-pointer transition-colors", theme.hover)} onClick={() => setActiveTab('deals')}>Deals</span> tab.
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                  <IdentitySection
                    formData={formData}
                    setFormData={setFormData}
                    unitConfigs={unitConfigs}
                    onConfigChange={handleConfigChange}
                    selectedConfig={selectedConfig}
                    towerPicker={needsTowerPicker ? {
                      towers,
                      towersLoading,
                      pickedTowerId,
                      pickedFloor,
                      setPickedTowerId,
                      setPickedFloor,
                    } : null}
                    existingUnitNumbers={
                      mode === 'edit' && unit?.unit_number
                        ? existingUnitNumbers.filter(n => n?.toLowerCase() !== unit.unit_number.toLowerCase())
                        : existingUnitNumbers
                    }
                  />
                  <PricingSection
                    formData={formData}
                    setFormData={setFormData}
                    isResidential={isResidential}
                    isLand={isLand}
                    isApartment={isApartment}
                    finalPrice={finalPrice}
                    selectedConfig={selectedConfig}
                  />
                  <ConstructionSection
                    formData={formData}
                    setFormData={setFormData}
                  />
                </>
              ) : activeTab === 'deals' ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm min-h-[300px]">
                  <UnitDealsPanel unit={unit} project={project} />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm min-h-[300px]">
                  <SiteVisitsPanel unit={unit} project={project} />
                </div>
              )}
            </div>

            {/* ── Fixed footer — hidden on deals/visits tabs ── */}
            <div className={cn('flex-shrink-0 bg-white border-t border-slate-100 px-6 py-3.5 flex items-center justify-between', (activeTab === 'deals' || activeTab === 'visits') && 'hidden')}>
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
                  disabled={saving || !canSubmit}
                  className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
