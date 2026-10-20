import React, { useRef, useEffect, useState } from 'react';
import {
  Radio,
  Trees,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Volume2,
  Crosshair,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ConservationPolicyData,
  STATUS_POLICY_OPEN,
  STATUS_TELEMETRY_SUBMITTED,
  STATUS_AWAITING_PAYOUT,
  STATUS_SETTLED_THRIVING,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_TERMINATED,
  STATUS_DISPUTED,
} from '../config/genlayer';
import { formatGen, getStatusMeta, truncateAddress } from '../utils/formatters';

interface CanopyRadarMatrixProps {
  policies: ConservationPolicyData[];
  selectedPolicyId: string | null;
  onSelectPolicy: (policy: ConservationPolicyData) => void;
  onOpenCreatePolicy: () => void;
}

interface RadarNode {
  policy: ConservationPolicyData;
  x: number;
  y: number;
  angle: number;
  dist: number;
  pulseRadius: number;
}

export const CanopyRadarMatrix: React.FC<CanopyRadarMatrixProps> = ({
  policies,
  selectedPolicyId,
  onSelectPolicy,
  onOpenCreatePolicy,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'thriving' | 'threats' | 'cooling'>('all');
  const [hoveredPolicy, setHoveredPolicy] = useState<ConservationPolicyData | null>(null);
  const animRef = useRef<number | null>(null);

  // Filtered policies
  const displayedPolicies = policies.filter((p) => {
    if (filterMode === 'thriving') return p.status === STATUS_SETTLED_THRIVING;
    if (filterMode === 'threats') {
      return (p.gunshot_events_detected || 0) > 0 || (p.chainsaw_minutes_detected || 0) > 0 || p.status === STATUS_SETTLED_TERMINATED;
    }
    if (filterMode === 'cooling') return p.status === STATUS_AWAITING_PAYOUT;
    return true;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 480);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 480;
      }
    };
    window.addEventListener('resize', handleResize);

    let sweepAngle = 0;
    let pulseStep = 0;

    const render = () => {
      sweepAngle = (sweepAngle + 0.02) % (Math.PI * 2);
      pulseStep = (pulseStep + 0.04) % (Math.PI * 2);

      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(cx, cy) - 25;

      // Clear Canvas
      ctx.fillStyle = '#030806';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Grid Background (Topographic Hex/Polar Grid)
      ctx.strokeStyle = 'rgba(38, 78, 62, 0.35)';
      ctx.lineWidth = 1;

      // Concentric Distance Rings
      const ringSteps = [0.25, 0.5, 0.75, 1.0];
      ringSteps.forEach((step, idx) => {
        const r = maxRadius * step;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Ring distance label
        ctx.fillStyle = 'rgba(72, 143, 115, 0.6)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`${(idx + 1) * 2.5}km Canopy Radius`, cx + 6, cy - r + 12);
      });

      // Crosshair Axes
      ctx.strokeStyle = 'rgba(38, 78, 62, 0.45)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.stroke();

      // Cardinal direction ticks
      ctx.fillStyle = '#10B981';
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N • EQUATORIAL CANOPY', cx, cy - maxRadius - 8);
      ctx.fillText('S • LOWLAND BASIN', cx, cy + maxRadius + 18);
      ctx.fillText('W', cx - maxRadius - 14, cy + 4);
      ctx.fillText('E', cx + maxRadius + 14, cy + 4);

      // 2. Radar Sweep Beam
      const sweepX = cx + Math.cos(sweepAngle) * maxRadius;
      const sweepY = cy + Math.sin(sweepAngle) * maxRadius;

      const sweepGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      sweepGradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      sweepGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, sweepAngle - 0.3, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Sweep leading line
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // 3. Draw Reserve Stations as Spatial Nodes
      const count = displayedPolicies.length;
      displayedPolicies.forEach((policy, idx) => {
        // Deterministic polar coordinates from policy_id
        const pIdNum = Number(policy.policy_id) || (idx + 1);
        const nodeAngle = (pIdNum * 1.35) % (Math.PI * 2);
        const nodeDistRatio = 0.35 + ((pIdNum * 0.27) % 0.55);
        const nodeDist = maxRadius * nodeDistRatio;

        const nx = cx + Math.cos(nodeAngle) * nodeDist;
        const ny = cy + Math.sin(nodeAngle) * nodeDist;

        const isSelected = selectedPolicyId === policy.policy_id;
        const hasGunshot = (policy.gunshot_events_detected || 0) > 0;
        const hasChainsaw = (policy.chainsaw_minutes_detected || 0) > 0;

        let baseColor = '#10B981'; // vibrant biophony green
        if (hasGunshot) baseColor = '#EF4444'; // crisis red
        else if (hasChainsaw) baseColor = '#F59E0B'; // logging amber
        else if (policy.status === STATUS_AWAITING_PAYOUT) baseColor = '#06B6D4'; // cooling cyan

        // Radiating acoustic sound waves from station
        const waveCount = isSelected ? 3 : 2;
        for (let w = 1; w <= waveCount; w++) {
          const waveRadius = 8 + ((pulseStep * 15 * w) % 35);
          const waveAlpha = Math.max(0, 1 - waveRadius / 35);
          ctx.strokeStyle = hasGunshot ? `rgba(239, 68, 68, ${waveAlpha * 0.8})` : `rgba(16, 185, 129, ${waveAlpha * 0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(nx, ny, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Center Node Dot
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(nx, ny, isSelected ? 7 : 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Node Glow
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = isSelected ? 16 : 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow

        // Label on node
        ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)';
        ctx.font = isSelected ? 'bold 10px "JetBrains Mono", monospace' : '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `#${policy.policy_id} ${policy.forest_reserve_id || 'RESERVE'}`,
          nx + 10,
          ny - 4
        );
        ctx.fillStyle = baseColor;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(
          `${policy.measured_ndsi_score || 0}% NDSI • ${formatGen(policy.escrow_amount, 1)}G`,
          nx + 10,
          ny + 8
        );
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [displayedPolicies, selectedPolicyId]);

  return (
    <div className="relative rounded-3xl bg-canopy-950 border border-canopy-700/80 shadow-2xl overflow-hidden">
      {/* Top Telemetry Header inside Radar */}
      <div className="px-6 py-4 bg-canopy-900/90 border-b border-canopy-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-bio-thriving/10 text-bio-thriving border border-bio-thriving/30 shadow-bio-glow">
            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '24s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-bio-thriving animate-pulse" />
              <h2 className="font-heading font-extrabold text-base text-white tracking-wide uppercase">
                Rainforest Canopy Sonar Array
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canopy-800 text-bio-lime border border-canopy-700">
                {policies.length} SENSORS ONLINE
              </span>
            </div>
            <p className="text-xs font-mono text-bio-muted mt-0.5">
              Autonomous 360° bioacoustic radar mapping equatorial rainforest acoustic biomes
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-canopy-950 border border-canopy-700 text-xs font-mono">
          {[
            { id: 'all', label: 'All Sectors' },
            { id: 'thriving', label: 'Pristine (100%)' },
            { id: 'threats', label: 'Threat Alerts' },
            { id: 'cooling', label: 'Cooling-Off' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterMode === tab.id
                  ? 'bg-bio-thriving text-canopy-950 font-bold shadow-bio-glow'
                  : 'text-bio-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={onOpenCreatePolicy}
            className="ml-2 px-3 py-1.5 rounded-xl bg-bio-cyan/20 hover:bg-bio-cyan text-bio-cyan hover:text-canopy-950 font-bold border border-bio-cyan transition-all"
          >
            + Deploy Pod
          </button>
        </div>
      </div>

      {/* Radar Canvas Viewport */}
      <div className="relative w-full h-[480px] bg-canopy-950 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Bottom Station Quick Selection Carousel inside Radar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 overflow-x-auto pb-1">
          {displayedPolicies.map((p) => {
            const isSelected = selectedPolicyId === p.policy_id;
            const meta = getStatusMeta(p.status);
            const hasGunshot = (p.gunshot_events_detected || 0) > 0;
            const hasChainsaw = (p.chainsaw_minutes_detected || 0) > 0;

            return (
              <div
                key={p.policy_id}
                onClick={() => onSelectPolicy(p)}
                className={`p-3 rounded-2xl cursor-pointer shrink-0 min-w-[200px] max-w-[260px] border backdrop-blur-md transition-all ${
                  isSelected
                    ? 'bg-canopy-850/95 border-bio-thriving shadow-bio-glow translate-y-[-2px]'
                    : 'bg-canopy-900/80 hover:bg-canopy-850/90 border-canopy-700/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold text-white truncate max-w-[140px]">
                    {p.forest_reserve_id || `Reserve #${p.policy_id}`}
                  </span>
                  <span className="text-bio-thriving font-bold">
                    {formatGen(p.escrow_amount, 1)}G
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-bio-muted">
                  <span className={p.measured_ndsi_score >= (p.min_ndsi_threshold || 60) ? 'text-bio-lime' : 'text-bio-amber'}>
                    NDSI: {p.measured_ndsi_score || 0}%
                  </span>
                  {hasGunshot ? (
                    <span className="px-1.5 py-0.2 rounded bg-bio-crisis/20 text-bio-crisis text-[10px] font-bold border border-bio-crisis/40">
                      POACHING
                    </span>
                  ) : hasChainsaw ? (
                    <span className="px-1.5 py-0.2 rounded bg-bio-amber/20 text-bio-amber text-[10px] font-bold border border-bio-amber/40">
                      CHAINSAW
                    </span>
                  ) : (
                    <span className="text-bio-thriving text-[10px]">Pristine</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
