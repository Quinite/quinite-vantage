'use client'

/**
 * DynamicIcon
 * Resolves an amenity icon by its lucide-react PascalCase name string.
 * Uses an explicit registry of only the icons needed for amenities —
 * avoiding the full lucide wildcard import for better bundle size.
 *
 * Usage: <DynamicIcon name="Waves" className="w-5 h-5 text-blue-500" />
 */
import {
  Waves, Dumbbell, Leaf, Footprints, Bike, Gamepad2, Trophy, CircleDot,
  Target, Sparkles, Building2, PartyPopper, Users, BookOpen, Mic2, Laptop,
  Briefcase, Baby, Smile, Bus, Heart, Music, Shield, Camera, Phone,
  ShieldCheck, Flame, Fingerprint, Lock, AlertTriangle, Car, SquareParking,
  Zap, Droplets, Layers, Sun, Filter, CloudRain, Wifi, Cpu, ShoppingCart,
  CreditCard, Cross, Shirt, Scissors, Trees, Sprout, PawPrint, Award,
  Wind, AirVent, LayoutDashboard, ChefHat, Square, SquareDashedBottom,
  Grid2x2, Paintbrush, ShowerHead, Pipette, Bath, Smartphone, Monitor,
  Network, Gauge, Package, Warehouse, Home, ArrowUpToLine, CircuitBoard,
  ToggleLeft,
} from 'lucide-react'

const ICON_REGISTRY = {
  Waves, Dumbbell, Leaf, Footprints, Bike, Gamepad2, Trophy, CircleDot,
  Target, Sparkles, Building2, PartyPopper, Users, BookOpen, Mic2, Laptop,
  Briefcase, Baby, Smile, Bus, Heart, Music, Shield, Camera, Phone,
  ShieldCheck, Flame, Fingerprint, Lock, AlertTriangle, Car, SquareParking,
  Zap, Droplets, Layers, Sun, Filter, CloudRain, Wifi, Cpu, ShoppingCart,
  CreditCard, Cross, Shirt, Scissors, Trees, Sprout, PawPrint, Award,
  Wind, AirVent, LayoutDashboard, ChefHat, Square, SquareDashedBottom,
  Grid2x2, Paintbrush, ShowerHead, Pipette, Bath, Smartphone, Monitor,
  Network, Gauge, Package, Warehouse, Home, ArrowUpToLine, CircuitBoard,
  ToggleLeft,
}

export function DynamicIcon({ name, className, ...rest }) {
  if (!name) return <span className={className} />
  const Icon = ICON_REGISTRY[name]
  if (!Icon) {
    // Fallback dot so layout never breaks for unrecognized icon names
    return (
      <svg
        viewBox="0 0 8 8"
        className={className}
        {...rest}
        aria-hidden="true"
      >
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
    )
  }
  return <Icon className={className} {...rest} />
}
