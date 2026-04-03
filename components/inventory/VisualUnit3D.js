'use client';

import { useState, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  ContactShadows, 
  Environment, 
  Float, 
  Text,
  Html,
  RoundedBox,
  BakeShadows,
  Stage,
  Cylinder
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, 
  Zap, 
  Box as BoxIcon,
  Sparkles,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Info,
  Building2,
  Trees
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/inventory';

const COLORS = {
  available: '#10b981',
  reserved: '#f59e0b',
  sold: '#ef4444',
  blocked: '#64748b',
  under_maintenance: '#a855f7',
  empty: '#cbd5e1',
  active: '#3b82f6',
};

const EMISSIVE = {
  available: '#064e3b',
  reserved: '#78350f',
  sold: '#7f1d1d',
  blocked: '#0f172a',
  under_maintenance: '#4c1d95',
  empty: '#475569',
  active: '#1e3a8a',
};

export default function VisualUnit3D({ 
  towers, 
  activeTowerId, 
  units, 
  onUnitClick, 
  onAddUnit, 
  paintingActive, 
  selectedConfig 
}) {
  const activeTower = towers.find(t => t.id === activeTowerId);
  const [hoveredUnit, setHoveredUnit] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  if (!activeTower) return null;

  const floors = useMemo(() => 
    Array.from({ length: activeTower.total_floors + 1 }, (_, i) => i), 
    [activeTower.total_floors]
  );
  
  const allUnitsInActiveTower = units[activeTowerId] || [];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
       containerRef.current.requestFullscreen();
       setIsFullscreen(true);
    } else {
       document.exitFullscreen();
       setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full h-full relative bg-gradient-to-br from-blue-50 to-emerald-50 rounded-[2.5rem] overflow-hidden group shadow-3xl border border-white/50 transition-all duration-700 ease-in-out",
        isFullscreen ? "fixed inset-0 z-[9999] rounded-none bg-white" : "h-[70vh] min-h-[600px]"
      )}
    >
      {/* 3D Realistic Viewport */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows gl={{ antialias: true }} dpr={[1, 2]}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[22, 18, 22]} fov={35} />
            <OrbitControls 
              makeDefault
              minDistance={10}
              maxDistance={50}
              maxPolarAngle={Math.PI / 2.05}
              autoRotate={!hoveredUnit && !paintingActive && !selectedFloor}
              autoRotateSpeed={0.5}
            />
            
            {/* Dynamic Local Lighting (No external fetch) */}
            <ambientLight intensity={1.2} />
            <directionalLight position={[50, 50, 40]} intensity={2.0} castShadow color="#fff4e0" />
            <pointLight position={[-30, 30, -30]} intensity={1.0} color="#fbbf24" />
            
            <SkyBg />

            <group position={[0, - (activeTower.total_floors * 1.5) / 2.5, 0]}>
               {/* Central Elevator/Lift Core */}
               <mesh position={[0, (activeTower.total_floors * 1.5) / 2, 0]} castShadow>
                 <boxGeometry args={[2.5, activeTower.total_floors * 1.5 + 2, 2.5]} />
                 <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.1} />
               </mesh>

               {floors.map(floorNum => (
                 <FloorLevel 
                   key={floorNum}
                   floorNum={floorNum}
                   tower={activeTower}
                   units={allUnitsInActiveTower}
                   selected={selectedFloor === floorNum}
                   isIsolated={selectedFloor !== null && selectedFloor !== floorNum}
                   onUnitClick={onUnitClick}
                   onAddUnit={onAddUnit}
                   setHoveredUnit={setHoveredUnit}
                   paintingActive={paintingActive}
                 />
               ))}

               {/* Landscaped Podium Base */}
               <mesh position={[0, -0.6, 0]} receiveShadow>
                 <boxGeometry args={[25, 0.5, 25]} />
                 <meshStandardMaterial color="#065f46" roughness={1} />
               </mesh>
               
               {/* Potted Palms/Trees on podium */}
               <DecorativeLandscaping />
            </group>

            <ContactShadows position={[0, - (activeTower.total_floors * 1.5) / 2.5 - 0.6, 0]} opacity={0.4} scale={50} blur={2.5} far={10} />
            <BakeShadows />
          </Suspense>
        </Canvas>
      </div>

      {/* Modern High-End Real Estate UI Overlay */}
      <div className="absolute top-8 left-8 right-8 z-10 flex justify-between items-start pointer-events-none">
         <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 bg-white/80 backdrop-blur-2xl px-6 py-4 rounded-[2rem] border border-white shadow-2xl pointer-events-auto"
         >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white p-2.5 shadow-xl shadow-emerald-500/20">
               <Building2 className="w-full h-full" />
            </div>
            <div>
               <h3 className="text-slate-900 font-black text-lg uppercase tracking-tighter italic leading-none">
                 {activeTower.name} <span className="text-emerald-600">Architectural View</span>
               </h3>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                 <Trees className="w-3 h-3" /> Podium Level Landscaping Active
               </p>
            </div>
         </motion.div>

         <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={toggleFullscreen}
              className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-xl border border-white flex items-center justify-center text-slate-800 hover:bg-emerald-600 hover:text-white transition-all shadow-xl"
            >
               {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
            </button>
            <button 
              className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-xl border border-white flex items-center justify-center text-slate-800 hover:bg-emerald-600 hover:text-white transition-all shadow-xl"
              onClick={() => window.location.reload()}
            >
               <RotateCcw className="w-6 h-6" />
            </button>
         </div>
      </div>

      {/* Floating Floor Selector (Indian Project Style) */}
      <div className="absolute left-8 bottom-10 z-10 flex flex-col gap-1.5 pointer-events-none">
         <div className="bg-white/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Floor Browser</span>
            </div>
            <div className="flex gap-1 overflow-x-auto max-w-[400px] scrollbar-hide py-1">
               {floors.map(num => (
                 <button
                   key={num}
                   onClick={() => setSelectedFloor(num === selectedFloor ? null : num)}
                   className={cn(
                     "min-w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-black border transition-all duration-300",
                     selectedFloor === num 
                       ? "bg-emerald-600 text-white border-emerald-400 shadow-xl"
                       : "bg-slate-100 text-slate-400 border-white hover:bg-slate-200"
                   )}
                 >
                   {num === 0 ? 'G' : num}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* Unit Detail Overlay (Smooth and Minimalist) */}
      <AnimatePresence>
        {hoveredUnit && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="absolute bottom-10 right-8 z-20 w-80 pointer-events-none"
          >
            <div className="bg-white/95 backdrop-blur-3xl border border-white rounded-[2.5rem] p-8 shadow-4xl pointer-events-auto">
               <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">
                      {hoveredUnit.unit_number || `S${hoveredUnit.slot_index + 1}`}
                    </h4>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">{hoveredUnit.config?.config_name || 'Floor Plan 1'}</p>
                  </div>
                  <div className={cn(
                    "px-4 py-1 rounded-full text-[9px] font-black uppercase border",
                    hoveredUnit.status === 'available' ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-rose-100 text-rose-600 border-rose-200"
                  )}>
                    {hoveredUnit.status || 'Vacant Slot'}
                  </div>
               </div>

               <div className="mt-8 grid grid-cols-2 gap-4">
                  <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Pricing</span>
                     <span className="text-xl font-black text-slate-900 italic">{formatINR(hoveredUnit.total_price || hoveredUnit.base_price)}</span>
                  </div>
                  <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Super Area</span>
                     <span className="text-xl font-black text-slate-900 italic">{hoveredUnit.carpet_area || '1,120'} <span className="text-[10px] lowercase font-normal italic">sqft</span></span>
                  </div>
               </div>

               <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => onUnitClick(hoveredUnit)}
                    className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
                  >
                    Edit Unit
                  </button>
                  <button className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 border border-white">
                    <Info className="w-6 h-6" />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Status (Center Bottom) */}
      {paintingActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="px-8 py-5 bg-emerald-600/90 backdrop-blur-2xl border border-emerald-400 rounded-[3rem] text-center shadow-[0_30px_100px_rgba(5,150,105,0.4)]"
           >
              <Zap className="w-10 h-10 text-white mx-auto mb-3 animate-pulse" />
              <h3 className="text-white font-black text-2xl italic uppercase tracking-tighter">Painting Active</h3>
              <p className="text-emerald-50 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Click Towers to Assign Config</p>
           </motion.div>
        </div>
      )}
    </div>
  );
}

function FloorLevel({ 
  floorNum, 
  tower, 
  units, 
  selected, 
  isIsolated,
  onUnitClick, 
  onAddUnit, 
  setHoveredUnit,
  paintingActive 
}) {
  const unitsPerFloor = tower.units_per_floor || 4;
  const spacing = 3.2; // wider spacing for realism
  const cols = Math.ceil(Math.sqrt(unitsPerFloor));
  
  const getLevelPos = (idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const offsetX = (cols - 1) * spacing * 0.5;
    const offsetZ = (Math.ceil(unitsPerFloor / cols) - 1) * spacing * 0.5;
    return [col * spacing - offsetX, floorNum * 1.5, row * spacing - offsetZ];
  };

  return (
    <group>
      {/* Structural Floor Slab */}
      <mesh position={[0, floorNum * 1.5 - 0.7, 0]} receiveShadow>
        <boxGeometry args={[cols * spacing + 2, 0.1, Math.ceil(unitsPerFloor / cols) * spacing + 2]} />
        <meshStandardMaterial 
          color={selected ? "#10b981" : "#94a3b8"} 
          roughness={0.5} 
          transparent
          opacity={isIsolated ? 0.05 : 1}
        />
      </mesh>

      {/* Realistic Building Units */}
      {Array.from({ length: unitsPerFloor }, (_, i) => i).map((slotIdx) => {
        const unit = units.find(u => Number(u.floor_number) === Number(floorNum) && u.metadata?.slot_index === slotIdx);
        return (
          <RealisticUnit 
            key={slotIdx}
            unit={unit}
            position={getLevelPos(slotIdx)}
            floorNum={floorNum}
            slotIdx={slotIdx}
            isIsolated={isIsolated}
            onUnitClick={onUnitClick}
            onAddUnit={onAddUnit}
            setHoveredUnit={setHoveredUnit}
          />
        );
      })}
    </group>
  );
}

function RealisticUnit({ unit, position, floorNum, slotIdx, isIsolated, onUnitClick, onAddUnit, setHoveredUnit }) {
  const [hover, setHover] = useState(false);
  const status = unit?.status || 'empty';

  return (
    <group position={position}>
       {/* The Main Unit Block */}
       <RoundedBox
          args={[2.5, 1.2, 2.5]}
          radius={0.1}
          onClick={(e) => { e.stopPropagation(); unit ? onUnitClick(unit) : onAddUnit(floorNum, slotIdx); }}
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); setHoveredUnit(unit || { slot_index: slotIdx, floor_number: floorNum }); }}
          onPointerOut={() => { setHover(false); setHoveredUnit(null); }}
          castShadow
          receiveShadow
       >
          <meshStandardMaterial 
            color={hover ? COLORS.active : COLORS[status]} 
            transparent 
            opacity={isIsolated ? 0.05 : 1} 
            metalness={0.2}
            roughness={0.6}
            emissive={hover ? EMISSIVE.active : EMISSIVE[status]}
            emissiveIntensity={hover ? 0.8 : 0.2}
          />
       </RoundedBox>

       {/* Decorative Balcony (Indian Architecture Style) */}
       {!isIsolated && (
          <mesh position={[0, -0.4, 1.45]} castShadow>
             <boxGeometry args={[2.0, 0.1, 0.6]} />
             <meshStandardMaterial color="#cbd5e1" roughness={0.1} />
          </mesh>
       )}

       {/* Glass Window Effect */}
       {!isIsolated && (
         <mesh position={[0, 0.1, 1.26]}>
            <boxGeometry args={[1.8, 0.7, 0.02]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.4} roughness={0} metalness={1} />
         </mesh>
       )}

       {localHoverLabel(hover, isIsolated, unit, slotIdx)}
    </group>
  );
}

function localHoverLabel(hover, isIsolated, unit, slotIdx) {
  if (!hover || isIsolated) return null;
  return (
    <Html position={[0, 1.2, 0]} center>
       <div className="bg-emerald-600 px-3 py-1 rounded-full text-[9px] font-black text-white uppercase whitespace-nowrap shadow-2xl pointer-events-none">
          {unit?.unit_number || `S${slotIdx + 1}`}
       </div>
    </Html>
  );
}

function DecorativeLandscaping() {
  return (
    <group>
       {/* Simple Decorative Shrubs */}
       {[[-8,0,8], [8,0,-8], [-8,0,-8], [8,0,8]].map((pos, i) => (
         <group key={i} position={pos}>
            <mesh position={[0, 0.2, 0]}>
               <cylinderGeometry args={[0.6, 0.4, 0.6]} />
               <meshStandardMaterial color="#064e3b" />
            </mesh>
            <mesh position={[0, 0.6, 0]}>
               <sphereGeometry args={[0.5]} />
               <meshStandardMaterial color="#059669" />
            </mesh>
         </group>
       ))}
    </group>
  )
}

function SkyBg() {
  return (
    <mesh scale={100}>
       <sphereGeometry args={[1, 64, 64]} />
       <meshBasicMaterial 
         color="#0f172a" 
         side={THREE.BackSide} 
       />
       <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </mesh>
  );
}

function Stars({ radius, depth, count, factor, saturation, fade, speed }) {
   const [positions, setPositions] = useMemo(() => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
         const r = radius + Math.random() * depth;
         const theta = Math.random() * 2 * Math.PI;
         const phi = Math.random() * Math.PI;
         positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
         positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
         positions[i * 3 + 2] = r * Math.cos(phi);
      }
      return [positions, count];
   }, [count, radius, depth]);

   return (
      <points>
         <bufferGeometry>
            <bufferAttribute 
               attach="attributes-position" 
               array={positions} 
               count={count} 
               itemSize={3} 
            />
         </bufferGeometry>
         <pointsMaterial size={0.15} color="white" transparent opacity={0.6} sizeAttenuation />
      </points>
   )
}
