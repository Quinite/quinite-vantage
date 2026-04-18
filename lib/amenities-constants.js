/**
 * Indian Real Estate Amenity Taxonomy
 * ====================================
 * Two separate contexts:
 *   'project' → Society / community amenities (pool, gym, clubhouse, security...)
 *   'unit'    → In-flat features (AC, modular kitchen, flooring, smart home...)
 *
 * Each amenity:
 *   id    — stable snake_case key stored in the database (never change these)
 *   label — human-readable label shown in the UI
 *   icon  — lucide-react icon name (PascalCase)
 *
 * Quick picks = the 6 most commonly expected amenities per context,
 * displayed as a fast-access row before the full category grid.
 */

// ─────────────────────────────────────────────────────────────────
// PROJECT (SOCIETY / COMMUNITY) AMENITIES
// ─────────────────────────────────────────────────────────────────

export const PROJECT_AMENITY_CATEGORIES = [
  {
    id: 'recreation',
    label: 'Recreation & Wellness',
    icon: 'Waves',
    amenities: [
      { id: 'swimming_pool',    label: 'Swimming Pool',         icon: 'Waves' },
      { id: 'gym',              label: 'Gymnasium',             icon: 'Dumbbell' },
      { id: 'yoga_deck',        label: 'Yoga / Meditation Deck', icon: 'Leaf' },
      { id: 'jogging_track',    label: 'Jogging Track',         icon: 'Footprints' },
      { id: 'cycling_track',    label: 'Cycling Track',         icon: 'Bike' },
      { id: 'indoor_games',     label: 'Indoor Games Room',     icon: 'Gamepad2' },
      { id: 'outdoor_sports',   label: 'Outdoor Sports Court',  icon: 'Trophy' },
      { id: 'tennis_court',     label: 'Tennis Court',          icon: 'CircleDot' },
      { id: 'badminton_court',  label: 'Badminton Court',       icon: 'CircleDot' },
      { id: 'cricket_net',      label: 'Cricket Practice Net',  icon: 'Target' },
      { id: 'spa',              label: 'Spa & Wellness Centre',  icon: 'Sparkles' },
    ],
  },
  {
    id: 'clubhouse',
    label: 'Clubhouse & Community',
    icon: 'Building2',
    amenities: [
      { id: 'clubhouse',        label: 'Clubhouse',             icon: 'Building2' },
      { id: 'banquet_hall',     label: 'Banquet / Party Hall',  icon: 'PartyPopper' },
      { id: 'community_hall',   label: 'Community Hall',        icon: 'Users' },
      { id: 'library',          label: 'Library / Reading Room', icon: 'BookOpen' },
      { id: 'amphitheater',     label: 'Open Amphitheater',     icon: 'Mic2' },
      { id: 'coworking',        label: 'Co-working Space',      icon: 'Laptop' },
      { id: 'business_centre',  label: 'Business Centre',       icon: 'Briefcase' },
    ],
  },
  {
    id: 'children',
    label: 'Kids & Family',
    icon: 'Baby',
    amenities: [
      { id: 'play_area',        label: "Children's Play Area",  icon: 'Baby' },
      { id: 'toddler_zone',     label: 'Toddler / Sand Pit Zone', icon: 'Smile' },
      { id: 'school_bus_point', label: 'School Bus Pick-up Point', icon: 'Bus' },
      { id: 'daycare',          label: 'Daycare / Crèche',      icon: 'Heart' },
      { id: 'teen_zone',        label: 'Teen Zone / Hangout',   icon: 'Music' },
    ],
  },
  {
    id: 'security',
    label: 'Security & Safety',
    icon: 'Shield',
    amenities: [
      { id: '24hr_security',    label: '24/7 Security',         icon: 'Shield' },
      { id: 'cctv',             label: 'CCTV Surveillance',     icon: 'Camera' },
      { id: 'intercom',         label: 'Video Intercom',        icon: 'Phone' },
      { id: 'boom_barrier',     label: 'Boom Barrier Entry',    icon: 'ShieldCheck' },
      { id: 'fire_noc',         label: 'Fire NOC / Sprinklers', icon: 'Flame' },
      { id: 'biometric_access', label: 'Biometric Access',      icon: 'Fingerprint' },
      { id: 'gated_community',  label: 'Gated Community',       icon: 'Lock' },
      { id: 'panic_button',     label: 'Panic Button / SOS',    icon: 'AlertTriangle' },
    ],
  },
  {
    id: 'parking',
    label: 'Parking & Mobility',
    icon: 'Car',
    amenities: [
      { id: 'covered_parking',       label: 'Covered / Stilt Parking', icon: 'Car' },
      { id: 'open_parking',          label: 'Open Parking',            icon: 'SquareParking' },
      { id: 'visitor_parking',       label: 'Visitor Parking',         icon: 'Users' },
      { id: 'ev_charging',           label: 'EV Charging Points',      icon: 'Zap' },
      { id: 'car_wash',              label: 'Car Wash Bay',            icon: 'Droplets' },
      { id: 'multi_level_parking',   label: 'Multi-level Car Parking', icon: 'Layers' },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities & Infrastructure',
    icon: 'Zap',
    amenities: [
      { id: 'power_backup',          label: '100% Power Backup',        icon: 'Zap' },
      { id: 'solar_power',           label: 'Solar Power / Panels',     icon: 'Sun' },
      { id: 'water_treatment',       label: 'Water Treatment Plant',    icon: 'Droplets' },
      { id: 'sewage_treatment',      label: 'STP (Sewage Treatment)',   icon: 'Filter' },
      { id: 'rainwater_harvesting',  label: 'Rainwater Harvesting',     icon: 'CloudRain' },
      { id: 'piped_gas',             label: 'Piped Gas (PNG)',          icon: 'Flame' },
      { id: 'high_speed_internet',   label: 'High-speed Internet / OFC', icon: 'Wifi' },
      { id: 'bms',                   label: 'Building Management System', icon: 'Cpu' },
    ],
  },
  {
    id: 'retail',
    label: 'Retail & Convenience',
    icon: 'ShoppingBag',
    amenities: [
      { id: 'supermarket',     label: 'Supermarket / Mini Mart', icon: 'ShoppingCart' },
      { id: 'atm',             label: 'ATM',                    icon: 'CreditCard' },
      { id: 'medical_store',   label: 'Pharmacy / Medical Store', icon: 'Cross' },
      { id: 'laundry',         label: 'Laundry Service',        icon: 'Shirt' },
      { id: 'salon',           label: 'Salon & Beauty Parlour', icon: 'Scissors' },
    ],
  },
  {
    id: 'green',
    label: 'Green & Environment',
    icon: 'Trees',
    amenities: [
      { id: 'landscaped_garden', label: 'Landscaped Garden',       icon: 'Trees' },
      { id: 'rooftop_garden',    label: 'Rooftop Garden / Terrace', icon: 'Leaf' },
      { id: 'organic_garden',    label: 'Organic / Herb Garden',   icon: 'Sprout' },
      { id: 'pet_zone',          label: 'Pet Park / Dog Walk Area', icon: 'PawPrint' },
      { id: 'green_certification', label: 'Green Building (IGBC/LEED)', icon: 'Award' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// UNIT (IN-FLAT) AMENITIES
// ─────────────────────────────────────────────────────────────────

export const UNIT_AMENITY_CATEGORIES = [
  {
    id: 'cooling_heating',
    label: 'Cooling & Heating',
    icon: 'Wind',
    amenities: [
      { id: 'split_ac',              label: 'Split AC (All Rooms)',       icon: 'Wind' },
      { id: 'split_ac_master',       label: 'Split AC (Master Bedroom)',  icon: 'Wind' },
      { id: 'central_ac',            label: 'Central / Ducted AC',        icon: 'AirVent' },
      { id: 'ac_provision',          label: 'AC Provision (False Ceiling)', icon: 'LayoutDashboard' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: 'ChefHat',
    amenities: [
      { id: 'modular_kitchen',   label: 'Modular Kitchen',        icon: 'ChefHat' },
      { id: 'chimney',           label: 'Built-in Chimney',       icon: 'Flame' },
      { id: 'hob',               label: 'Built-in Hob',          icon: 'Flame' },
      { id: 'granite_counter',   label: 'Granite Counter Top',   icon: 'Square' },
      { id: 'ss_sink',           label: 'SS / Quartz Sink',      icon: 'Droplets' },
      { id: 'dishwasher_point',  label: 'Dishwasher Point',      icon: 'Waves' },
    ],
  },
  {
    id: 'flooring_walls',
    label: 'Flooring & Finish',
    icon: 'Layers',
    amenities: [
      { id: 'vitrified_flooring', label: 'Vitrified Tile Flooring',   icon: 'SquareDashedBottom' },
      { id: 'wooden_flooring',    label: 'Wooden / Laminate Flooring', icon: 'Layers' },
      { id: 'marble_flooring',    label: 'Marble / Italian Marble',   icon: 'Gem' },
      { id: 'designer_tiles',     label: 'Designer Wall Tiles',       icon: 'Grid2x2' },
      { id: 'false_ceiling',      label: 'False Ceiling (All Rooms)', icon: 'LayoutDashboard' },
      { id: 'texture_paint',      label: 'Texture / Designer Paint',  icon: 'Paintbrush' },
    ],
  },
  {
    id: 'bathroom',
    label: 'Bathroom & Fittings',
    icon: 'ShowerHead',
    amenities: [
      { id: 'branded_fittings',    label: 'Branded CP Fittings',        icon: 'ShowerHead' },
      { id: 'concealed_plumbing',  label: 'Concealed Plumbing',         icon: 'Pipette' },
      { id: 'geyser_provision',    label: 'Geyser Provision',           icon: 'Flame' },
      { id: 'western_wc',          label: 'Western Commode (All Baths)', icon: 'Bath' },
      { id: 'jacuzzi',             label: 'Jacuzzi / Bathtub',          icon: 'Bath' },
      { id: 'exhaust_fan',         label: 'Exhaust Fan (All Baths)',    icon: 'Wind' },
    ],
  },
  {
    id: 'smart_home',
    label: 'Smart Home',
    icon: 'Smartphone',
    amenities: [
      { id: 'smart_locks',        label: 'Smart Digital Door Lock',  icon: 'Lock' },
      { id: 'home_automation',    label: 'Home Automation Ready',    icon: 'Cpu' },
      { id: 'video_door_phone',   label: 'Video Door Phone',         icon: 'Monitor' },
      { id: 'wired_network',      label: 'Wired Network Points',     icon: 'Network' },
      { id: 'smart_meter',        label: 'Smart Energy Meter',       icon: 'Gauge' },
    ],
  },
  {
    id: 'storage',
    label: 'Storage & Wardrobe',
    icon: 'Package',
    amenities: [
      { id: 'wardrobes',          label: 'Built-in Wardrobes',       icon: 'Package' },
      { id: 'utility_room',       label: 'Utility / Store Room',     icon: 'Warehouse' },
      { id: 'servant_quarters',   label: "Servant / Maid's Quarter", icon: 'Home' },
      { id: 'loft_storage',       label: 'Overhead Loft Storage',    icon: 'ArrowUpToLine' },
    ],
  },
  {
    id: 'power',
    label: 'Power & Wiring',
    icon: 'Zap',
    amenities: [
      { id: 'copper_wiring',      label: 'ISI Copper Wiring',         icon: 'Zap' },
      { id: 'mcb_db',             label: 'MCB / DB Box',              icon: 'CircuitBoard' },
      { id: 'modular_switches',   label: 'Modular Switches (Branded)', icon: 'ToggleLeft' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// LOOKUP MAPS  (O(1) id → amenity resolution)
// ─────────────────────────────────────────────────────────────────

export const PROJECT_AMENITY_MAP = Object.fromEntries(
  PROJECT_AMENITY_CATEGORIES.flatMap(cat => cat.amenities.map(a => [a.id, a]))
)

export const UNIT_AMENITY_MAP = Object.fromEntries(
  UNIT_AMENITY_CATEGORIES.flatMap(cat => cat.amenities.map(a => [a.id, a]))
)

/** Combined map — use when the context is unknown (e.g. display components) */
export const ALL_AMENITY_MAP = { ...PROJECT_AMENITY_MAP, ...UNIT_AMENITY_MAP }

// ─────────────────────────────────────────────────────────────────
// QUICK PICKS  (shown as fast-access chips at the top of the picker)
// ─────────────────────────────────────────────────────────────────

export const PROJECT_QUICK_PICKS = [
  'swimming_pool',
  'gym',
  '24hr_security',
  'covered_parking',
  'power_backup',
  'play_area',
  'clubhouse',
  'cctv',
]

export const UNIT_QUICK_PICKS = [
  'split_ac',
  'modular_kitchen',
  'vitrified_flooring',
  'wardrobes',
  'false_ceiling',
  'branded_fittings',
]
