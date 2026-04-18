/**
 * Shared property constants — used by both the inventory config form
 * (ResidentialConfigForm) and the CRM client preferences card (ClientPreferencesCard).
 * Update here to propagate changes everywhere.
 */

export const PROPERTY_CATEGORIES = [
  { id: 'residential', label: 'Residential' },
  { id: 'commercial',  label: 'Commercial'  },
  { id: 'land',        label: 'Land'        },
]

export const PROPERTY_TYPES = {
  residential: [
    { id: 'Apartment',  label: 'Apartment'      },
    { id: 'Villa',      label: 'Villa Bungalow' },
    { id: 'Penthouse',  label: 'Penthouse'      },
  ],
  commercial: [
    { id: 'Office',     label: 'Office'     },
    { id: 'Retail',     label: 'Retail'     },
    { id: 'Showroom',   label: 'Showroom'   },
    { id: 'Industrial', label: 'Industrial' },
  ],
  land: [
    { id: 'Plot', label: 'Plot' },
    { id: 'Land', label: 'Land' },
  ],
}

/** Only shown when preferred_category === 'residential' */
export const RESIDENTIAL_CONFIGURATIONS = [
  '1RK', '1BHK', '1.5BHK', '2BHK', '2.5BHK',
  '3BHK', '3.5BHK', '4BHK', '5BHK', 'Penthouse',
]

export const TRANSACTION_TYPES = [
  { id: 'sell',  label: 'Buy'   },
  { id: 'rent',  label: 'Rent'  },
  { id: 'lease', label: 'Lease' },
]

export const PURCHASE_TIMELINES = [
  'Immediate',
  '1-3 Months',
  '3-6 Months',
  '6+ Months',
  'Investment Only',
]
