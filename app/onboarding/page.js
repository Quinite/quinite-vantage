'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Home,
  Briefcase,
  MapPin,
  FileText,
  Check
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

const getPhoneDigits = (value) => (value || '').replace(/\D/g, '')
const isValidIndianMobile = (value) => /^[6-9]\d{9}$/.test(getPhoneDigits(value).slice(-10))

const STEPS = [
  { id: 1, title: 'Sector', icon: Briefcase },
  { id: 2, title: 'Business Type', icon: Building2 },
  { id: 3, title: 'Company Details', icon: FileText },
  { id: 4, title: 'Address', icon: MapPin },
  { id: 5, title: 'Review', icon: Check }
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState('')
  const [fetchingPincode, setFetchingPincode] = useState(false)
  const [user, setUser] = useState(null)
  const [org, setOrg] = useState(null)

  // Form data
  const [formData, setFormData] = useState({
    sector: 'real_estate',
    businessType: '',
    companyName: '',
    gstin: '',
    contactNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: ''
  })


  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('🔍 [Onboarding] Starting user check...')
        // Use getUser() to fetch fresh data from server (not cached session)
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.log('❌ [Onboarding] No user found, redirecting to login')
          router.push('/')
          return
        }

        console.log('✅ [Onboarding] User authenticated:', { id: user.id, email: user.email })
        console.log('📋 [Onboarding] User metadata:', user.user_metadata)

        // Check if user has explicit 'company_name' metadata from signup
        if (user.user_metadata?.company_name) {
          console.log('Setting company name:', user.user_metadata.company_name)
          setFormData(prev => ({ ...prev, companyName: user.user_metadata.company_name }))
        }

        // Also set full_name if available
        if (user.user_metadata?.full_name) {
          setFormData(prev => ({ ...prev, fullName: user.user_metadata.full_name }))
        }

        console.log('🔍 [Onboarding] Fetching user profile...')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('❌ [Onboarding] Profile fetch error:', profileError)
        }

        console.log('📊 [Onboarding] Profile data:', {
          hasProfile: !!profile,
          organizationId: profile?.organization_id,
          organizationData: profile?.organizations,
          onboardingStatus: profile?.organizations?.onboarding_status
        })

        if (profile?.organization_id) {
          const status = profile.organizations?.onboarding_status
          console.log('🏢 [Onboarding] Found existing org:', {
            id: profile.organization_id,
            status,
            orgName: profile.organizations?.name
          })

          // Check if onboarding is truly complete
          if (status === 'COMPLETED') {
            console.log('✅ [Onboarding] Status is COMPLETED - User already onboarded!')
            console.log('🔄 [Onboarding] Redirecting to dashboard (hard navigation)...')
            // Use hard navigation to ensure fresh data load
            window.location.href = '/dashboard'
            return
          } else {
            console.log('⚠️ [Onboarding] Status is NOT completed:', status)
            console.log('📝 [Onboarding] User needs to complete onboarding form')
          }
        } else {
          console.log('⚠️ [Onboarding] No organization_id found - user needs onboarding')
        }

        // Load any existing organization profile data (preserves metadata values)
        console.log('📥 [Onboarding] Loading existing profile data...')
        await loadProfile()
        console.log('✅ [Onboarding] Profile data loaded, showing onboarding form')

      } catch (err) {
        console.error('❌ [Onboarding] Error checking user:', err)
      } finally {
        console.log('🏁 [Onboarding] Check complete, setting loading to false')
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const checkStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/')
        return
      }

      // Add timeout to prevent infinite loading
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      try {
        const userResponse = await fetch('/api/auth/user', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data')
        }

        const userData = await userResponse.json()

        if (!userData.user) {
          router.push('/')
          return
        }

        // Allow onboarding for:
        // 1. Users without a role yet (initial onboarding)
        // 2. Users with Client Super Admin role
        const userRole = userData.user.profile?.role?.name
        const hasOrganization = userData.user.profile?.organization_id

        // If user has a role but it's not Client Super Admin, block onboarding
        if (userRole && userRole !== 'Client Super Admin') {
          setError('Only Client Super Admin can complete onboarding')
          setLoading(false)
          return
        }

        // If onboarding completed, redirect to dashboard
        if (userData.user.profile?.organization?.onboarding_status === 'completed') {
          router.push('/dashboard')
          return
        }

        setUser(userData.user)
        setOrg(userData.user.profile?.organization)

        // Load existing profile data if any
        await loadProfile()
        setLoading(false)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          setError('Request timeout. Please check your connection and try again.')
        } else {
          setError('Failed to load user data. Please try again.')
        }
        setLoading(false)
      }
    } catch (error) {
      console.error('Error in checkStatus:', error)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const loadProfile = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/organization/profile', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn('No existing profile found, starting fresh')
        return
      }

      const data = await response.json()

      if (data.profile && Object.keys(data.profile).length > 0) {
        // Preserve companyName from metadata if profile doesn't have one
        setFormData(prev => ({
          sector: data.profile.sector || prev.sector || 'real_estate',
          businessType: data.profile.business_type || prev.businessType || '',
          companyName: data.profile.company_name || prev.companyName || '',
          gstin: data.profile.gstin || '',
          contactNumber: data.profile.contact_number || '',
          addressLine1: data.profile.address_line_1 || '',
          addressLine2: data.profile.address_line_2 || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          country: data.profile.country || 'India',
          pincode: data.profile.pincode || ''
        }))
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Profile load timeout:', error)
      } else {
        console.error('Error loading profile:', error)
      }
      // Don't block onboarding if profile load fails
    }
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handlePincodeChange = async (value) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    updateFormData('pincode', numericValue)

    // If 6 digits, fetch details
    if (numericValue.length === 6) {
      setFetchingPincode(true)
      try {
        // Only fetch Indian pincode details if country is India or not selected (default)
        if (formData.country === 'India' || !formData.country) {
          const response = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`)
          const data = await response.json()

          if (data && data[0].Status === 'Success') {
            const details = data[0].PostOffice[0]
            setFormData(prev => ({
              ...prev,
              city: details.District,
              state: details.State,
              country: 'India'
            }))
            toast.success(`Location found: ${details.District}, ${details.State}`)
          } else {
            toast.error('Invalid Pincode or location not found')
            setFormData(prev => ({ ...prev, city: '', state: '' }))
          }
        }
      } catch (err) {
        console.error('Error fetching pincode:', err)
        toast.error('Failed to fetch location details')
      } finally {
        setFetchingPincode(false)
      }
    }
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      await fetch('/api/organization/profile', {
        method: 'PUT', // ✅ FIXED
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: formData.sector,
          businessType: formData.businessType,
          companyName: formData.companyName,
          gstin: formData.gstin,
          contactNumber: formData.contactNumber,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          country: formData.country || '', // Ensure country is saved, default to empty if not selected
          pincode: formData.pincode,
          isComplete: false
        })
      })
    } catch (error) {
      console.error('Error saving draft:', error)
      const message = error instanceof Error ? error.message : 'Failed to save draft'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }


  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.sector !== ''
      case 2:
        return formData.businessType !== ''
      case 3:
        return formData.companyName.trim() !== '' &&
          (formData.country === 'India'
            ? isValidIndianMobile(formData.contactNumber)
            : getPhoneDigits(formData.contactNumber).length >= 5)
      case 4:
        return formData.addressLine1.trim().length >= 5 &&
          formData.city.trim() !== '' &&
          formData.state.trim() !== '' &&
          formData.pincode.trim() !== ''

      case 5:
        return true
      default:
        return false
    }
  }

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.sector) {
          toast.error('Please select a sector')
          return false
        }
        return true
      case 2:
        if (!formData.businessType) {
          toast.error('Please select a business type')
          return false
        }
        return true
      case 3:
        if (!formData.companyName.trim()) {
          toast.error('Company name is required')
          return false
        }
        if (!formData.contactNumber.trim()) {
          toast.error('Contact number is required')
          return false
        }
        // Validate phone number (10 digits for India, general check for others)
        if (formData.country === 'India') {
          if (!isValidIndianMobile(formData.contactNumber)) {
            toast.error('Please enter a valid 10-digit Indian mobile number')
            return false
          }
        } else {
          if (getPhoneDigits(formData.contactNumber).length < 5) {
            toast.error('Please enter a valid contact number')
            return false
          }
        }
        return true
      case 4:
        if (!formData.addressLine1.trim()) {
          toast.error('Address line 1 is required')
          return false
        }
        if (formData.addressLine1.trim().length < 5) {
          toast.error('Address must be at least 5 characters')
          return false
        }
        if (!formData.pincode.trim()) {

          toast.error('Pincode is required')
          return false
        }
        if (!formData.city.trim()) {
          toast.error('City is required')
          return false
        }
        if (!formData.state.trim()) {
          toast.error('State is required')
          return false
        }
        return true
      case 5:
        return true
      default:
        return false
    }
  }


  const nextStep = async () => {
    if (!validateStep()) return

    // Save draft when moving forward
    await saveDraft()

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError('')
    }
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        sector: formData.sector,
        businessType: formData.businessType,
        companyName: formData.companyName,
        gstin: formData.gstin,
        contactNumber: formData.contactNumber,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        country: formData.country || '', // Ensure country is sent, default to empty if not selected
        pincode: formData.pincode,
        isComplete: true
      }

      const response = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || JSON.stringify(data.error) || 'Failed to complete onboarding')
      }

      // Success! Redirect to super admin dashboard
      toast.success('Onboarding completed successfully!')

      // Wait a moment to ensure database transaction completes
      await new Promise(resolve => setTimeout(resolve, 500))

      // Force a hard navigation to super admin dashboard
      window.location.href = '/dashboard/admin'


    } catch (error) {
      console.error('Onboarding error:', error)
      // Handle object errors that might bubble up
      let message = 'An unexpected error occurred'
      if (typeof error === 'string') message = error
      else if (error instanceof Error) message = error.message
      else if (error && typeof error === 'object' && error.message) message = error.message
      else if (error && typeof error === 'object') message = JSON.stringify(error)

      toast.error(message)
      // Keep setError empty to avoid alert
      setError('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-10 w-64 rounded" />
            <Skeleton className="h-5 w-48 rounded" />
          </div>

          <div className="flex justify-between items-center gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-xl p-6 space-y-6">
            <Skeleton className="h-8 w-1/3 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4"
              onClick={async () => {
                await fetch('/api/auth/signout', { method: 'POST' })
                await supabase.auth.signOut()
                router.push('/')
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Onboarding</h1>
          <p className="text-gray-600 mt-2">Complete your business profile to get started</p>
          <p className="text-sm text-gray-500 mt-1">Organization: <strong>{org?.name}</strong></p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id

              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-green-600 text-white' : ''}
                      ${isCurrent ? 'bg-blue-600 text-white' : ''}
                      ${!isCurrent && !isCompleted ? 'bg-gray-300 text-gray-600' : ''}
                    `}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <p className={`text-xs ml-2 text-center ${isCurrent ? 'font-bold' : ''}`}>
                    {step.title}
                  </p>

                  {
                    index < STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                    )
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>
              Step {currentStep} of 5: {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Select your business sector'}
              {currentStep === 2 && 'Choose your business type'}
              {currentStep === 3 && 'Enter your company information'}
              {currentStep === 4 && 'Provide your business address'}
              {currentStep === 5 && 'Review and submit your details'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">


            {/* Step 1: Sector */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Label>Select your sector</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => updateFormData('sector', 'real_estate')}
                    className={`p-6 border-2 rounded-lg text-left transition-all ${formData.sector === 'real_estate'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <Home className="w-8 h-8 mb-2 text-blue-600" />
                    <h3 className="font-semibold text-lg">Real Estate</h3>
                    <p className="text-sm text-gray-600 mt-1">Property sales, rentals, and management</p>
                  </button>

                  <div className="p-6 border-2 border-gray-200 rounded-lg text-left opacity-50 cursor-not-allowed">
                    <Briefcase className="w-8 h-8 mb-2 text-gray-400" />
                    <h3 className="font-semibold text-lg">Other Sectors</h3>
                    <p className="text-sm text-gray-600 mt-1">Coming Soon</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Business Type */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Label>What type of real estate business are you?</Label>
                <RadioGroup value={formData.businessType} onValueChange={(value) => updateFormData('businessType', value)}>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="agent" id="agent" />
                    <Label htmlFor="agent" className="cursor-pointer flex-1">
                      <div>
                        <p className="font-medium">Real Estate Agent / Broker</p>
                        <p className="text-sm text-gray-400">Individual agents or brokerage firms</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="builder" id="builder" />
                    <Label htmlFor="builder" className="cursor-pointer flex-1">
                      <div>
                        <p className="font-medium">Real Estate Developer / Builder</p>
                        <p className="text-sm text-gray-400">Property development and construction companies</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Step 3: Company Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    placeholder="Enter your company name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="gstin">GSTIN (Optional)</Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      // Limit to 15 characters
                      if (value.length <= 15) {
                        updateFormData('gstin', value)
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (value && value.length > 0) {
                        // Validate if user entered something
                        if (value.length !== 15) {
                          setError('GSTIN must be exactly 15 characters')
                        } else {
                          const stateCode = parseInt(value.substring(0, 2))
                          if (isNaN(stateCode) || stateCode < 1 || stateCode > 37) {
                            setError('Invalid GSTIN: First 2 digits must be a valid state code (01-37)')
                          } else {
                            setError('') // Clear error if valid
                          }
                        }
                      }
                    }}
                    placeholder="Enter your GSTIN (15 characters)"
                    className="mt-1"
                    maxLength={15}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Goods and Services Tax Identification Number (15 characters, first 2 digits = state code)
                  </p>
                </div>

                <div>
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <PhoneInput
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(value) => updateFormData('contactNumber', value)}
                    placeholder={formData.country === 'India' ? "98765 43210" : "Enter contact number"}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.country === 'India' ? 'Enter 10-digit mobile number (starting with 6, 7, 8, or 9)' : 'Enter your contact number'}
                  </p>
                </div>

              </div>
            )}

            {/* Step 4: Address */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => updateFormData('addressLine1', e.target.value)}
                    placeholder="Building name, street"
                    className={`mt-1 ${formData.addressLine1.trim() && formData.addressLine1.trim().length < 5 ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {formData.addressLine1.trim() && formData.addressLine1.trim().length < 5 && (
                    <p className="text-xs text-red-500 mt-1 animate-in fade-in duration-300">
                      Address must be at least 5 characters
                    </p>
                  )}

                </div>

                <div>
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => updateFormData('addressLine2', e.target.value)}
                    placeholder="Area, landmark (optional)"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <div className="relative">
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        placeholder="Enter 6-digit Pincode"
                        className="mt-1"
                        maxLength={6}
                      />
                      {fetchingPincode && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                      placeholder="City (Auto-filled for India)"
                      className="mt-1 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateFormData('state', e.target.value)}
                      placeholder="State (Auto-filled for India)"
                      className="mt-1 bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => {
                        updateFormData('country', value)
                        // Clear city/state/pincode if country changes and it's not India
                        if (value !== 'India') {
                          setFormData(prev => ({ ...prev, city: '', state: '', pincode: '' }))
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="mt-1">
                    Please review your information before submitting. You can go back to edit any details.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Sector</h3>
                    <p className="text-lg">Real Estate</p>
                  </div>
                  <Separator />

                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Business Type</h3>
                    <p className="text-lg capitalize">{formData.businessType.replace('_', ' ')}</p>
                  </div>
                  <Separator />

                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Company Details</h3>
                    <p className="text-lg">{formData.companyName}</p>
                    {formData.gstin && <p className="text-sm text-gray-600">GSTIN: {formData.gstin}</p>}
                    <p className="text-sm text-gray-600">Contact: {formData.contactNumber}</p>
                  </div>
                  <Separator />

                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Address</h3>
                    <p className="text-sm">{formData.addressLine1}</p>
                    {formData.addressLine2 && <p className="text-sm">{formData.addressLine2}</p>}
                    <p className="text-sm">{formData.city}, {formData.state} - {formData.pincode}</p>
                    <p className="text-sm">{formData.country}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || submitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex gap-2">
                {currentStep < 5 ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={saveDraft}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button onClick={nextStep} disabled={saving || !isStepValid()}>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                  </>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? 'Submitting...' : 'Complete Onboarding'}
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Need help? Contact support or save your progress and continue later.
        </p>
      </div>
    </div>
  )
}
