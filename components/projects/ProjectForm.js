import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Loader2,
    Building2,
    Home,
    MapPin,
    DollarSign,
    IndianRupee,
    Upload,
    Image as ImageIcon,
    Store,
    LandPlot,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    Building,
    TreePine,
    Castle,
    Briefcase,
    ShoppingBag,
    Warehouse,
    Factory,
    Plus,
    Trash2,
    Edit
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import ResidentialConfigForm from '@/components/projects/ResidentialConfigForm'
import { Country, State, City } from 'country-state-city'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Calendar } from "@/components/ui/calendar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    PROJECT_STATUS_CONFIG,
    PROJECT_STATUS_OPTIONS
} from '@/lib/inventory'
import AmenitiesPicker from '@/components/amenities/AmenitiesPicker'
import AmenitiesDisplay from '@/components/amenities/AmenitiesDisplay'
import { Sparkles } from 'lucide-react'

const STEPS = [
    { id: 'basic',     title: 'Basic Info', icon: Building2,    description: 'Project identity & Type' },
    { id: 'location',  title: 'Location',   icon: MapPin,       description: 'Address details' },
    { id: 'inventory', title: 'Inventory',  icon: Store,        description: 'Configs & Status' },
    { id: 'amenities', title: 'Amenities',  icon: Sparkles,     description: 'Society features' },
    { id: 'review',    title: 'Review',     icon: CheckCircle2, description: 'Review & Submit' },
]

export default function ProjectForm({ initialData, onSubmit, onCancel, isSubmitting }) {
    const fileRef = useRef(null)
    const [uploading, setUploading] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [touched, setTouched] = useState({})
    const [errors, setErrors] = useState({})
    const [completedSteps, setCompletedSteps] = useState(new Set())

    const [showAddConfig, setShowAddConfig] = useState(false)
    const [openCountry, setOpenCountry] = useState(false)
    const [openState, setOpenState] = useState(false)
    const [openCity, setOpenCity] = useState(false)

    // Initialize state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        imageUrl: '',
        imagePath: null,
        transaction: 'sell',
        propertyCategory: 'residential',
        propertyUseCase: 'apartment',
        bhk: '2bhk',
        carpetArea: '',
        builtUpArea: '',
        superBuiltUpArea: '',
        commercialArea: '',
        commercialBuiltUpArea: '',
        commercialBuiltUpArea: '',
        groundFloor: false,
        configurations: [],
        plotArea: '',
        locCity: '',
        locLocality: '',
        locLandmark: '',
        locState: '',
        locCountry: 'India',
        locPincode: '',

        // Inventory fields
        totalUnits: '',
        unitTypes: [], // Array of detailed config objects
        projectStatus: initialData?.project_status && initialData.project_status !== 'draft' ? initialData.project_status : 'planning',
        possessionDate: '',
        completionDate: '',
        showInInventory: initialData?.show_in_inventory ?? true,
        publicVisibility: initialData?.public_visibility ?? true,
        isDraft: initialData ? (initialData.is_draft === true) : true,
        showFullDescription: false,
        amenities: [],
    })

    const countries = Country.getAllCountries()
    const currentCountryIso = countries.find(c => c.name === formData.locCountry)?.isoCode || 'IN'
    const states = State.getStatesOfCountry(currentCountryIso)
    const currentStateIso = states.find(s => s.name === formData.locState)?.isoCode || ''
    const cities = currentStateIso ? City.getCitiesOfState(currentCountryIso, currentStateIso) : []

    // Load initial data
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                address: initialData.address || '',
                imageUrl: initialData.image_url || '',
                imagePath: initialData.image_path || null,
                transaction: 'sell',
                propertyCategory: 'residential',
                propertyUseCase: 'apartment',
                bhk: '2bhk',
                carpetArea: '',
                builtUpArea: '',
                superBuiltUpArea: '',
                configurations: [],
                commercialArea: '',
                commercialBuiltUpArea: '',
                groundFloor: false,
                plotArea: '',
                reraNumber: initialData.rera_number || '',
                locCity: initialData.city || '',
                locLocality: initialData.locality || '',
                locLandmark: initialData.landmark || '',
                locState: initialData.state || '',
                locCountry: initialData.country || 'India',
                locPincode: initialData.pincode || '',
                isDraft: !!(initialData.is_draft ?? (initialData.project_status === 'draft')),
                // Inventory fields
                totalUnits: initialData.total_units || '',
                unitTypes: Array.isArray(initialData.unit_configs) && initialData.unit_configs.length > 0
                    ? initialData.unit_configs.map(uc => ({
                        ...uc,
                        configuration: uc.config_name,
                        price: uc.base_price,
                        type: uc.property_type
                    }))
                    : [],
                projectStatus: initialData.project_status === 'draft' ? 'planning' : (initialData.project_status || 'planning'),
                possessionDate: initialData.possession_date || '',
                completionDate: initialData.completion_date || '',
                showInInventory: initialData.show_in_inventory !== false,
                publicVisibility: initialData.public_visibility ?? true,
                amenities: Array.isArray(initialData.amenities) ? initialData.amenities : [],
            })

            // Don't auto-mark all steps as completed, so users see their current progress
            // as they navigate through the wizard like a normal flow.
        }
    }, [initialData])

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error when field is modified
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }))
        }
    }

    const handlePincodeChange = (value) => {
        const numericValue = value.replace(/\D/g, '').slice(0, 6)
        handleChange('locPincode', numericValue)
    }

    const validateStep = (stepIndex) => {
        const newErrors = {}
        const data = formData

        if (stepIndex === 0) { // Basic Info
            if (!data.name.trim()) newErrors.name = 'Project name is required'
            if (!data.description.trim()) newErrors.description = 'Description is required'
            else if (data.description.length < 50) newErrors.description = 'Description must be at least 50 characters'
            if (!data.imageUrl) newErrors.imageUrl = 'Project image is mandatory'
        }

        if (stepIndex === 1) { // Location
            if (!data.address.trim()) newErrors.address = 'Detailed address is required'
            if (!data.locCountry?.trim()) newErrors.locCountry = 'Country is required'
            if (!data.locState.trim()) newErrors.locState = 'State is required'
            if (!data.locCity.trim()) newErrors.locCity = 'City is required'
            if (!data.locPincode.trim() || data.locPincode.length !== 6) newErrors.locPincode = 'Valid 6-digit Pincode is required'
            if (!data.locLocality.trim()) newErrors.locLocality = 'Locality is required'
        }

        // stepIndex === 3 is Amenities — always valid (optional step)

        if (stepIndex === 2) { // Inventory
            if (!data.unitTypes || data.unitTypes.length === 0) {
                newErrors.unitTypes = 'At least one unit configuration is required'
            } else {
                // Validate each unit type - they have configuration/property_type, not name
                data.unitTypes.forEach((ut, idx) => {
                    if (!ut.configuration && !ut.property_type) {
                        newErrors[`unitType_${idx}_config`] = 'Configuration or property type is required'
                    }
                    // Price is optional
                })
            }
            
            // Date validation
            if (['planning', 'under_construction'].includes(data.projectStatus)) {
                if (!data.possessionDate) newErrors.possessionDate = 'Possession date is required'
            } else if (['ready_to_move', 'completed'].includes(data.projectStatus)) {
                if (!data.completionDate) newErrors.completionDate = 'Completion date is required'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = () => {
        if (validateStep(currentStep)) {
            // Mark current step as completed
            setCompletedSteps(prev => new Set([...prev, currentStep]))
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            const stepErrors = Object.keys(errors)
            if (stepErrors.length > 0) {
                toast.error("Please fill all required fields before proceeding.")
            }
        }
    }

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Check if current step is valid (for button states)
    const isCurrentStepValid = () => {
        const newErrors = {}
        const data = formData

        if (currentStep === 0) { // Basic Info
            if (!data.name.trim()) return false
            if (!data.description.trim()) return false
            if (data.description.length < 50) return false
            if (!data.imageUrl) return false
        }

        if (currentStep === 1) { // Location
            if (!data.address.trim()) return false
            if (!data.locCountry?.trim()) return false
            if (!data.locState.trim()) return false
            if (!data.locCity.trim()) return false
            if (!data.locPincode.trim() || data.locPincode.length !== 6) return false
            if (!data.locLocality.trim()) return false
        }

        if (currentStep === 2) { // Inventory
            if (!data.unitTypes || data.unitTypes.length === 0) return false
            // Check each unit type is valid - they have configuration/property_type, not name
            for (const ut of data.unitTypes) {
                // Must have either configuration or property_type
                if (!ut.configuration && !ut.property_type) return false
            }

            // Check date based on status
            if (['planning', 'under_construction'].includes(data.projectStatus)) {
                if (!data.possessionDate) return false
            } else if (['ready_to_move', 'completed'].includes(data.projectStatus)) {
                if (!data.completionDate) return false
            }

            return true
        }

        return true
    }

    // Check if entire form is valid (for Create button)
    const isFormValid = () => {
        return (
            formData.name?.trim() &&
            formData.description?.trim() &&
            formData.description.length >= 50 &&
            formData.imageUrl &&
            formData.address?.trim() &&
            formData.locCity?.trim() &&
            formData.locLocality?.trim() &&
            formData.unitTypes?.length > 0 &&
            formData.unitTypes.every(ut =>
                (ut.configuration || ut.property_type)
            ) &&
            ((['planning', 'under_construction'].includes(formData.projectStatus) && formData.possessionDate) ||
             (['ready_to_move', 'completed'].includes(formData.projectStatus) && formData.completionDate))
        )
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error("Only images allowed")
            return
        }

        setUploading(true)
        setErrors(prev => ({ ...prev, imageUrl: null }))

        try {
            const res = await fetch('/api/projects/upload-url', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            await fetch(data.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            })

            handleChange('imageUrl', data.image_url)
            handleChange('imagePath', data.image_path)
            toast.success("Image uploaded successfully!")
        } catch (err) {
            console.error(err)
            toast.error("Image upload failed")
        } finally {
            setUploading(false)
        }
    }







    const handleSubmit = (isDraftSave = false) => {
        // If saving as draft, we only require the name
        if (isDraftSave) {
            if (!formData.name.trim()) {
                toast.error("Please enter a project name to save as draft")
                return
            }
            onSubmit({ ...formData, isDraft: true })
            return
        }
        if (validateStep(currentStep)) {
            // Calculate total units from configurations (no longer used as primary source)
            const calculatedTotalUnits = Number(formData.totalUnits) || 0

            // Add calculated total to formData
            const submitData = {
                ...formData,
                isDraft: false,
                totalUnits: calculatedTotalUnits,
            }

            onSubmit(submitData)
        }
    }

    return (
        <div className="flex flex-col h-full min-h-[500px]">
            {/* Stepper Header */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border-b px-4 py-6 md:px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-slate-600">Step {currentStep + 1} of {STEPS.length}</span>
                            <span className="text-xs font-semibold text-blue-600">{Math.round(((currentStep + 1) / STEPS.length) * 100)}% Complete</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center justify-between relative">
                        {/* Connection Line */}
                        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 -z-10" />

                        {STEPS.map((step, idx) => {
                            const StepIcon = step.icon
                            const isCompleted = completedSteps.has(idx)
                            const isCurrent = idx === currentStep
                            const isVisited = idx < currentStep
                            const showWarning = isVisited && !isCompleted

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => {
                                        // Allow navigation to current step (no-op)
                                        if (idx === currentStep) return

                                        // Going backward - always allowed
                                        if (idx < currentStep) {
                                            setCurrentStep(idx)
                                            return
                                        }

                                        // Going forward - must validate current step first
                                        if (idx > currentStep) {
                                            if (validateStep(currentStep)) {
                                                setCompletedSteps(prev => new Set([...prev, currentStep]))
                                                setCurrentStep(idx)
                                                window.scrollTo({ top: 0, behavior: 'smooth' })
                                            } else {
                                                toast.error("Please complete the current step before proceeding")
                                            }
                                        }
                                    }}
                                    className={`flex flex-col items-center gap-2 relative transition-all duration-300 group cursor-pointer hover:scale-105 ${isCurrent ? 'scale-110' : ''
                                        }`}
                                >
                                    <div
                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${isCompleted
                                            ? 'bg-green-500 text-white'
                                            : showWarning
                                                ? 'bg-amber-500 text-white'
                                                : isCurrent
                                                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                                    : 'bg-white text-slate-400 border-2 border-slate-200'
                                            } group-hover:shadow-lg`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                        ) : showWarning ? (
                                            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                        ) : (
                                            <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-xs sm:text-sm font-semibold transition-colors ${isCurrent
                                            ? 'text-blue-600'
                                            : isCompleted
                                                ? 'text-green-600'
                                                : showWarning
                                                    ? 'text-amber-600'
                                                    : 'text-slate-400'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">{step.description}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 py-4 md:py-8 max-w-5xl mx-auto w-full pb-20 px-3 md:px-6">
                {currentStep === 0 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-6">
                            <div>
                                <label className="text-xs sm:text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    Project Name *
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="e.g. Sunrise Heights, Green Valley Residency"
                                    className={`transition-all text-xs sm:text-sm ${errors.name ? "border-red-300 focus-visible:ring-red-200" : formData.name ? "border-green-400 focus-visible:ring-green-200" : ""}`}
                                />
                                {errors.name && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
                                {!errors.name && formData.name && <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Looks good!</p>}
                            </div>



                            <div>
                                <label className="text-xs sm:text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-blue-600" />
                                    Description *
                                </label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => handleChange('description', e.target.value)}
                                    placeholder="Describe your project in detail... Include amenities like swimming pool, gym, children's play area, 24/7 security, proximity to schools, hospitals, shopping centers, etc."
                                    rows={5}
                                    className={`transition-all text-xs sm:text-sm ${errors.description ? "border-red-300 focus-visible:ring-red-200" : formData.description.length >= 50 ? "border-green-400 focus-visible:ring-green-200" : ""}`}
                                />
                                <div className="flex justify-between items-center mt-2">
                                    {errors.description ? (
                                        <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.description}</p>
                                    ) : formData.description.length >= 50 ? (
                                        <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Great description!</p>
                                    ) : (
                                        <span className="hidden"></span>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden`}>
                                            <div
                                                className={`h-full transition-all duration-300 ${formData.description.length >= 50 ? 'bg-green-500' :
                                                    formData.description.length >= 25 ? 'bg-yellow-500' : 'bg-red-400'
                                                    }`}
                                                style={{ width: `${Math.min((formData.description.length / 50) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className={`text-xs font-semibold ${formData.description.length >= 50 ? 'text-green-600' :
                                            formData.description.length >= 25 ? 'text-amber-600' : 'text-red-500'
                                            }`}>
                                            {formData.description.length}/50
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs sm:text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-blue-600" />
                                    Project Banner Image *
                                </label>
                                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50/30 ${errors.imageUrl ? 'border-red-300 bg-red-50/30' :
                                    formData.imageUrl ? 'border-green-400 bg-green-50/20' : 'border-slate-300'
                                    }`}>
                                    <input
                                        type="file"
                                        ref={fileRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    {formData.imageUrl ? (
                                        <div className="relative group">
                                            <img
                                                src={formData.imageUrl}
                                                alt="Preview"
                                                className="w-full h-56 object-cover rounded-lg shadow-md"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} className="shadow-lg">
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Change Image
                                                </Button>
                                            </div>
                                            <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Uploaded
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 cursor-pointer" onClick={() => fileRef.current?.click()}>
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg">
                                                {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">Click to upload or drag and drop</p>
                                                <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {errors.imageUrl && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.imageUrl}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs sm:text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-2">
                                        <LandPlot className="w-4 h-4 text-blue-600" />
                                        Total Land Area (Acres/Sqft)
                                    </label>
                                    <Input
                                        value={formData.plotArea}
                                        onChange={e => handleChange('plotArea', e.target.value)}
                                        placeholder="e.g. 5 Acres"
                                        className="transition-all text-xs sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs sm:text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-2">
                                        <Building className="w-4 h-4 text-blue-600" />
                                        RERA Number
                                    </label>
                                    <Input
                                        value={formData.reraNumber || ''}
                                        onChange={e => handleChange('reraNumber', e.target.value)}
                                        placeholder="e.g. P51800001234"
                                        className="transition-all text-xs sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>



                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t mt-6">
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="text-xs sm:text-sm py-1.5 px-2 sm:py-2 sm:px-4 w-full sm:w-auto">
                                Cancel
                            </Button>
                            <div className="flex gap-2 w-full sm:w-auto">
                                {formData.isDraft && (
                                    <Button
                                        variant="outline"
                                        onClick={() => handleSubmit(true)}
                                        disabled={isSubmitting}
                                        className="text-xs sm:text-sm w-full sm:w-auto"
                                    >
                                        Save Draft
                                    </Button>
                                )}
                                <Button
                                    onClick={handleNext}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-1.5 px-2 sm:py-2 sm:px-4 w-full sm:w-auto sm:min-w-[120px]"
                                >
                                    Next Step
                                </Button>
                            </div>
                        </div>
                    </div>
                )
                }











                {
                    currentStep === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid gap-6">
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">Full Address *</label>
                                    <Input
                                        value={formData.address}
                                        onChange={e => handleChange('address', e.target.value)}
                                        placeholder="e.g. Plot No. 123, Main Street, Near Central Park, Sector 5"
                                        className={`transition-all text-xs sm:text-sm ${errors.address ? "border-red-300 focus-visible:ring-red-200" : formData.address ? "border-green-400 focus-visible:ring-green-200" : ""}`}
                                    />
                                    {errors.address && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.address}</p>}
                                    {!errors.address && formData.address && <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Address saved!</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">Country *</label>
                                        <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCountry}
                                                    className={cn("w-full justify-between text-xs sm:text-sm", errors.locCountry ? "border-red-300" : "")}
                                                >
                                                    {formData.locCountry || "Select Country"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search country..." className="text-xs sm:text-sm" />
                                                    <CommandList>
                                                        <CommandEmpty>No country found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {countries.map((c) => (
                                                                <CommandItem
                                                                    key={c.isoCode}
                                                                    value={c.name}
                                                                    onSelect={() => {
                                                                        setFormData(prev => ({ ...prev, locCountry: c.name, locState: '', locCity: '' }))
                                                                        setOpenCountry(false)
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", formData.locCountry === c.name ? "opacity-100" : "opacity-0")} />
                                                                    {c.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {errors.locCountry && <p className="text-xs text-red-500 mt-1">{errors.locCountry}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">State *</label>
                                        <Popover open={openState} onOpenChange={setOpenState}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openState}
                                                    disabled={states.length === 0}
                                                    className={cn("w-full justify-between text-xs sm:text-sm", errors.locState ? "border-red-300" : "")}
                                                >
                                                    {formData.locState || "Select State"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search state..." className="text-xs sm:text-sm" />
                                                    <CommandList>
                                                        <CommandEmpty>No state found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {states.map((s) => (
                                                                <CommandItem
                                                                    key={s.isoCode}
                                                                    value={s.name}
                                                                    onSelect={() => {
                                                                        setFormData(prev => ({ ...prev, locState: s.name, locCity: '' }))
                                                                        setOpenState(false)
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", formData.locState === s.name ? "opacity-100" : "opacity-0")} />
                                                                    {s.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {errors.locState && <p className="text-xs text-red-500 mt-1">{errors.locState}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">City *</label>
                                        {cities.length > 0 ? (
                                            <Popover open={openCity} onOpenChange={setOpenCity}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openCity}
                                                        className={cn("w-full justify-between text-xs sm:text-sm", errors.locCity ? "border-red-300" : "")}
                                                    >
                                                        {formData.locCity || "Select City"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search city..." className="text-xs sm:text-sm" />
                                                        <CommandList>
                                                            <CommandEmpty>No city found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {cities.map((c) => (
                                                                    <CommandItem
                                                                        key={c.name}
                                                                        value={c.name}
                                                                        onSelect={() => {
                                                                            setFormData(prev => ({ ...prev, locCity: c.name }))
                                                                            setOpenCity(false)
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", formData.locCity === c.name ? "opacity-100" : "opacity-0")} />
                                                                        {c.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        ) : (
                                            <Input
                                                value={formData.locCity}
                                                onChange={e => handleChange('locCity', e.target.value)}
                                                placeholder="e.g. Mumbai"
                                                className={`text-xs sm:text-sm ${errors.locCity ? "border-red-300" : ""}`}
                                            />
                                        )}
                                        {errors.locCity && <p className="text-xs text-red-500 mt-1">{errors.locCity}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">Pincode *</label>
                                        <div className="relative">
                                            <Input
                                                value={formData.locPincode}
                                                onChange={e => handlePincodeChange(e.target.value)}
                                                placeholder="6-digit Pincode"
                                                maxLength={6}
                                                className={`text-xs sm:text-sm ${errors.locPincode ? "border-red-300" : ""}`}
                                            />
                                        </div>
                                        {errors.locPincode && <p className="text-xs text-red-500 mt-1">{errors.locPincode}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">Locality *</label>
                                        <Input
                                            value={formData.locLocality}
                                            onChange={e => handleChange('locLocality', e.target.value)}
                                            placeholder="e.g. Bandra West"
                                            className={`text-xs sm:text-sm ${errors.locLocality ? "border-red-300" : ""}`}
                                        />
                                        {errors.locLocality && <p className="text-xs text-red-500 mt-1">{errors.locLocality}</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1.5 block">Landmark</label>
                                        <Input
                                            value={formData.locLandmark}
                                            onChange={e => handleChange('locLandmark', e.target.value)}
                                            placeholder="e.g. Near St. Peter's Church"
                                            className="text-xs sm:text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center gap-1 sm:gap-3 pt-4 border-t mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                    className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm py-1.5 px-1 sm:py-2 sm:px-4"
                                >
                                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
                                    Back
                                </Button>
                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    {formData.isDraft && (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleSubmit(true)}
                                            disabled={isSubmitting}
                                            className="text-xs sm:text-sm w-full sm:w-auto"
                                        >
                                            Save Draft
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleNext}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-1.5 px-2 sm:py-2 sm:px-4 w-full sm:w-auto sm:min-w-[120px]">
                                        Next Step
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    currentStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pt-6">
                            <div className="grid gap-6 max-w-3xl mx-auto">

                                {/* Unit Types Breakdown */}
                                <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-semibold text-slate-800 block">Unit Configurations</label>
                                        {!showAddConfig && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowAddConfig(true)}
                                                className="bg-white"
                                            >
                                                <Plus className="w-3 h-3 mr-1" /> Add Config
                                            </Button>
                                        )}
                                    </div>

                                    {/* Modal for adding configuration */}
                                    <Dialog open={showAddConfig} onOpenChange={setShowAddConfig}>
                                        <DialogContent className="max-w-2xl p-0 overflow-hidden shadow-2xl border-none gap-0">
                                            <div className="px-6 py-4 border-b bg-slate-50/50">
                                                <DialogTitle className="text-sm font-bold text-slate-900 uppercase tracking-tight">Add New Unit Config</DialogTitle>
                                            </div>
                                            <div className="p-6">
                                            <ResidentialConfigForm
                                                onCancel={() => setShowAddConfig(false)}
                                                category={formData.propertyCategory}
                                                onAdd={(newConfig) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        unitTypes: [...prev.unitTypes, newConfig]
                                                    }))
                                                    setShowAddConfig(false)
                                                }}
                                            />
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {formData.unitTypes.map((ut, index) => (
                                                <div key={index} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                                                    <div className="flex-1">
                                                        {(ut.config_name || ut.property_type) ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm text-slate-800">
                                                                    {ut.config_name} {ut.property_type}
                                                                </span>
                                                                <span className="text-xs text-slate-400 font-semibold">
                                                                    {ut.carpet_area || ut.plot_area} sqft • <span className="capitalize">{ut.transaction_type || 'Sell'}</span>
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="font-semibold text-sm text-slate-800">New Configuration</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (confirm("Are you sure you want to delete this configuration?")) {
                                                                    const newTypes = formData.unitTypes.filter((_, i) => i !== index)
                                                                    setFormData(prev => ({ ...prev, unitTypes: newTypes }))
                                                                }
                                                            }}
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {formData.unitTypes.length === 0 && (
                                                <div className="col-span-full py-8 text-center text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg">
                                                    No unit configs added yet. Click "Add Config" to start.
                                                </div>
                                            )}
                                        </div>
                                </div>

                                {/* Project Status */}
                                <div>
                                    <label className="text-sm font-semibold text-slate-800 mb-2 block">Project Status</label>
                                    <Select
                                        value={formData.projectStatus}
                                        onValueChange={(val) => {
                                            handleChange('projectStatus', val)
                                            // Reset irrelevant date when status changes
                                            const config = PROJECT_STATUS_CONFIG[val]
                                            if (config?.showCompletion) {
                                                handleChange('possessionDate', '')
                                            } else if (config?.showPossession) {
                                                handleChange('completionDate', '')
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-full rounded-lg border-2 border-slate-300 h-11 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100 shadow-xl p-1">
                                            {PROJECT_STATUS_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value} className="text-sm font-medium py-2.5">
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Dynamic Date Fields */}
                                {PROJECT_STATUS_CONFIG[formData.projectStatus]?.showPossession && (
                                    <div className="animate-in fade-in duration-300">
                                        <label className="text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-2">
                                            Expected Possession Date *
                                        </label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-medium h-11 rounded-lg border-2",
                                                        !formData.possessionDate && "text-slate-400",
                                                        errors.possessionDate ? 'border-red-300' : 'border-slate-300'
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                                                    {formData.possessionDate ? format(parseISO(formData.possessionDate), "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.possessionDate ? parseISO(formData.possessionDate) : undefined}
                                                    onSelect={(date) => handleChange('possessionDate', date ? format(date, "yyyy-MM-dd") : '')}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.possessionDate && <p className="text-xs text-red-500 mt-1">{errors.possessionDate}</p>}
                                    </div>
                                )}

                                {PROJECT_STATUS_CONFIG[formData.projectStatus]?.showCompletion && (
                                    <div className="animate-in fade-in duration-300">
                                        <label className="text-sm font-semibold text-slate-800 mb-2 block flex items-center gap-2">
                                            Completion Date *
                                        </label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-medium h-11 rounded-lg border-2",
                                                        !formData.completionDate && "text-slate-400",
                                                        errors.completionDate ? 'border-red-300' : 'border-slate-300'
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                                                    {formData.completionDate ? format(parseISO(formData.completionDate), "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.completionDate ? parseISO(formData.completionDate) : undefined}
                                                    onSelect={(date) => handleChange('completionDate', date ? format(date, "yyyy-MM-dd") : '')}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.completionDate && <p className="text-xs text-red-500 mt-1">{errors.completionDate}</p>}
                                    </div>
                                )}

                                {/* Show in Inventory Toggle */}
                                <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-semibold text-blue-900 block">Show in Inventory Module</label>
                                            <p className="text-xs text-blue-700 mt-1">Make this project visible in the inventory management section</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('showInInventory', !formData.showInInventory)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.showInInventory ? 'bg-blue-600' : 'bg-gray-300'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.showInInventory ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center gap-1 sm:gap-3 pt-4 border-t mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={isSubmitting || currentStep === 0}
                                    className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm py-1.5 px-1 sm:py-2 sm:px-4"
                                >
                                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
                                    Back
                                </Button>
                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    {formData.isDraft && (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleSubmit(true)}
                                            disabled={isSubmitting}
                                            className="text-xs sm:text-sm w-full sm:w-auto"
                                        >
                                            Save Draft
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleNext}
                                        disabled={!isCurrentStepValid() || isSubmitting}
                                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm py-1.5 px-2 sm:py-2 sm:px-4 w-full sm:w-auto sm:min-w-[120px] ml-auto">
                                        Next Step
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* ─── Step 3: Amenities ──────────────────────────── */}
                {
                    currentStep === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-800">Society &amp; Community Amenities</h3>
                                    <p className="text-sm text-slate-500 mt-1">Select the amenities available in the society / building. You can skip this step and add them later.</p>
                                </div>
                                <AmenitiesPicker
                                    context="project"
                                    value={formData.amenities}
                                    onChange={(ids) => handleChange('amenities', ids)}
                                    variant="full"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between gap-3 pt-4 border-t mt-6 max-w-3xl mx-auto">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                    className="text-slate-500 hover:text-slate-800"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <div className="flex gap-3">
                                    {formData.isDraft && (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleSubmit(true)}
                                            disabled={isSubmitting}
                                            className="text-xs sm:text-sm w-full sm:w-auto"
                                        >
                                            Save as Draft
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleNext}
                                        disabled={isSubmitting}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {formData.amenities.length > 0 ? 'Next' : 'Skip & Review'}
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* ─── Step 4: Review ─────────────────────────────── */}
                {
                    currentStep === 4 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="max-w-3xl mx-auto space-y-4">
                                {/* Basic Info Summary */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                                        <CardTitle className="text-base font-bold">Basic Information</CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setCurrentStep(0)} className="text-blue-600 hover:text-blue-700">
                                            <Edit className="w-3 h-3 mr-1" />
                                            Edit
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Project Name</p>
                                                <p className="text-sm font-semibold">{formData.name || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Status</p>
                                                <Badge
                                                    variant={PROJECT_STATUS_CONFIG[formData.projectStatus]?.variant || 'secondary'}
                                                    className={cn(
                                                        "text-xs capitalize",
                                                        formData.isDraft ? 'bg-orange-500 text-white' : (PROJECT_STATUS_CONFIG[formData.projectStatus]?.badge || 'bg-blue-600 text-white')
                                                    )}
                                                >
                                                    {formData.isDraft ? 'Draft' : (PROJECT_STATUS_CONFIG[formData.projectStatus]?.label || 'Planning')}
                                                </Badge>
                                            </div>
                                            {(PROJECT_STATUS_CONFIG[formData.projectStatus]?.showPossession || formData.isDraft) && formData.possessionDate && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        Expected Possession
                                                    </p>
                                                    <p className="text-sm font-semibold">{new Date(formData.possessionDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                                </div>
                                            )}
                                            {PROJECT_STATUS_CONFIG[formData.projectStatus]?.showCompletion && formData.completionDate && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <CalendarIcon className="w-3 h-3 text-blue-500" />
                                                        Completion Date
                                                    </p>
                                                    <p className="text-sm font-semibold">{new Date(formData.completionDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-xs text-gray-500">Description</p>
                                            <div className="text-sm">
                                                {formData.description.length > 200 && !formData.showFullDescription ? (
                                                    <>
                                                        {formData.description.substring(0, 200)}...
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleChange('showFullDescription', true)
                                                            }}
                                                            className="text-blue-600 ml-1 font-semibold hover:underline"
                                                        >
                                                            Show More
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {formData.description}
                                                        {formData.description.length > 200 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleChange('showFullDescription', false)
                                                                }}
                                                                className="text-blue-600 ml-1 font-semibold hover:underline"
                                                            >
                                                                Show Less
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {formData.imageUrl && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1.5">Project Image</p>
                                                <img src={formData.imageUrl} alt="Project" className="w-32 h-32 object-cover rounded-lg border" />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Location Summary */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                                        <CardTitle className="text-base font-bold">Location</CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-blue-600 hover:text-blue-700">
                                            <Edit className="w-3 h-3 mr-1" />
                                            Edit
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Country / State</p>
                                                <p className="text-sm font-semibold">{formData.locCountry || '-'} {formData.locState ? `/ ${formData.locState}` : ''}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">City</p>
                                                <p className="text-sm font-semibold">{formData.locCity || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Locality</p>
                                                <p className="text-sm font-semibold">{formData.locLocality || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Pincode</p>
                                                <p className="text-sm font-semibold">{formData.locPincode || '-'}</p>
                                            </div>
                                            {formData.locLandmark && (
                                                <div className="col-span-2">
                                                    <p className="text-xs text-muted-foreground">Landmark</p>
                                                    <p className="text-sm">{formData.locLandmark}</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Inventory Summary */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                                        <CardTitle className="text-base font-bold">Inventory</CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="text-blue-600 hover:text-blue-700">
                                            <Edit className="w-3 h-3 mr-1" />
                                            Edit
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {formData.unitTypes && formData.unitTypes.length > 0 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-2">Unit Configurations</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {formData.unitTypes.map((ut, idx) => {
                                                        const formatPrice = (p) => {
                                                            if (!p) return 'N/A'
                                                            const num = Number(p)
                                                            if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Crores`
                                                            if (num >= 100000) return `${(num / 100000).toFixed(2)} Lacs`
                                                            return num.toLocaleString('en-IN')
                                                        }
                                                        return (
                                                            <div key={idx} className="bg-slate-50 p-3 rounded-lg border">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="text-sm font-semibold">
                                                                            {ut.config_name} {ut.property_type ? ut.property_type : ''}
                                                                        </p>
                                                                        <p className="text-xs text-gray-400 font-semibold capitalize">
                                                                            {ut.transaction_type} • {ut.category} • {ut.carpet_area || ut.plot_area} <span className="lowercase">{ut.area_unit || 'sqft'}</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-bold text-blue-600">₹{formatPrice(ut.base_price || ut.price)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Amenities Summary */}
                                {formData.amenities.length > 0 && (
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-amber-500" />
                                                Amenities
                                                <span className="text-xs font-normal text-slate-400">({formData.amenities.length} selected)</span>
                                            </CardTitle>
                                            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="text-blue-600 hover:text-blue-700">
                                                <Edit className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            <AmenitiesDisplay
                                                amenityIds={formData.amenities}
                                                context="project"
                                                variant="tags"
                                            />
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between gap-3 pt-4 border-t mt-6 max-w-3xl mx-auto">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                    className="text-slate-500 hover:text-slate-800"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => handleSubmit()}
                                        disabled={!isFormValid() || isSubmitting}
                                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                {initialData ? 'Updating...' : 'Creating Project...'}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                {initialData ? 'Update Project' : 'Create Project'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    )
}
