import React, { useRef, useEffect, useState } from 'react';
import { Activity, Radio, Volume2, ShieldAlert, Zap, Waves, BarChart3 } from 'lucide-react';

interface BioacousticCanvasProps {
  ndsiScore?: number;
  gunshots?: number;
  chainsaws?: number;
  statusText?: string;
  isAudioPlaying?: boolean;
}

type VisualizerMode = 'waterfall' | 'fft' | 'oscilloscope';

export const BioacousticCanvas: React.FC<BioacousticCanvasProps> = ({
  ndsiScore = 75,
  gunshots = 0,
  chainsaws = 0,
  statusText = 'MONITORING',
  isAudioPlaying = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('waterfall');
  const animFrameIdRef = useRef<number | null>(null);

  // Buffer for waterfall spectrogram
  const waterfallHistoryRef = useRef<number[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 720);
    let height = (canvas.height = 240);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 240;
      }
    };
    window.addEventListener('resize', handleResize);

    const numBands = 96;
    if (waterfallHistoryRef.current.length === 0) {
      for (let i = 0; i < 60; i++) {
        waterfallHistoryRef.current.push(new Array(numBands).fill(0));
      }
    }

    let phase = 0;
    let gunshotImpulseTimer = 0;

    const render = () => {
      phase += 0.05;

      // Simulate instantaneous frequency spectrum
      const currentSpectrum = new Array(numBands).fill(0);
      const isCrisis = gunshots > 0;
      const isDisturbed = chainsaws > 0;

      // Trigger periodic gunshot impulse spike if reserve has gunshots detected
      if (isCrisis) {
        gunshotImpulseTimer++;
        if (gunshotImpulseTimer % 45 === 0) {
          gunshotImpulseTimer = 0;
        }
      }

      for (let i = 0; i < numBands; i++) {
        const freqRatio = i / numBands; // 0 (0 Hz) -> 1 (12 kHz)
        let energy = 0;

        // Base atmospheric canopy rustle noise
        energy += 0.12 + Math.random() * 0.08;

        // 1. Anthrophony band (approx 100 Hz - 500 Hz, low index 1 to 12)
        if (i >= 1 && i <= 12) {
          if (isDisturbed) {
            // Sawtooth-like intense harmonic buzz
            energy += 0.55 + 0.35 * Math.sin(phase * 4 + i * 1.5) + (Math.random() * 0.15);
          } else {
            energy += 0.08 * Math.sin(phase + i);
          }
        }

        // 2. Biophony band (approx 2 kHz - 8 kHz, index 24 to 75)
        if (i >= 24 && i <= 75) {
          const bioStrength = (ndsiScore / 100);
          const birdHarmonic = Math.sin(phase * 2.5 + i * 0.4) * Math.cos(phase * 1.2 + i * 0.2);
          const insectDrone = Math.sin(phase * 6 + i * 0.8) * 0.25;
          energy += (bioStrength * 0.65) * Math.max(0, birdHarmonic + insectDrone + (Math.random() * 0.2));
        }

        // 3. Gunshot impulsive broadband shockwave (vertical burst across all frequencies)
        if (isCrisis && gunshotImpulseTimer < 5) {
          energy += 0.9 + Math.random() * 0.1;
        }

        currentSpectrum[i] = Math.min(1.0, Math.max(0.02, energy));
      }

      // Push to waterfall queue
      waterfallHistoryRef.current.shift();
      waterfallHistoryRef.current.push(currentSpectrum);

      // CLEAR CANVAS
      ctx.fillStyle = '#050D0A';
      ctx.fillRect(0, 0, width, height);

      // DRAW BASED ON SELECTED MODE
      if (mode === 'waterfall') {
        const history = waterfallHistoryRef.current;
        const rowHeight = height / history.length;
        const colWidth = width / numBands;

        for (let row = 0; row < history.length; row++) {
          const spec = history[row];
          const y = row * rowHeight;

          for (let col = 0; col < numBands; col++) {
            const val = spec[col];
            const x = col * colWidth;

            // Frequency classification color mapping
            let r = 16, g = 185, b = 129; // default emerald biophony

            if (col <= 14) {
              // Anthrophony zone (Amber / Orange)
              if (isDisturbed) {
                r = 245; g = 158; b = 11;
              } else {
                r = 180; g = 140; b = 40;
              }
            } else if (col >= 75) {
              // Ultrasonic / high bats (Cyan)
              r = 6; g = 182; b = 212;
            }

            // Gunshot shockwave overrides with vivid crimson
            if (val > 0.85) {
              r = 239; g = 68; b = 68;
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${val * 0.95})`;
            ctx.fillRect(x, y, colWidth + 0.5, rowHeight + 0.5);
          }
        }

        // Draw frequency split lines & indicators
        ctx.strokeStyle = 'rgba(72, 143, 115, 0.25)';
        ctx.lineWidth = 1;

        // 500 Hz Anthrophony cutoff line
        const anthroX = (14 / numBands) * width;
        ctx.beginPath();
        ctx.moveTo(anthroX, 0);
        ctx.lineTo(anthroX, height);
        ctx.stroke();

        // 8 kHz Biophony cutoff line
        const bioX = (75 / numBands) * width;
        ctx.beginPath();
        ctx.moveTo(bioX, 0);
        ctx.lineTo(bioX, height);
        ctx.stroke();

        // Scanning beam effect
        const scanY = (phase * 35) % height;
        const grad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.35)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 15, width, 30);

      } else if (mode === 'fft') {
        // FFT Frequency bar visualizer
        const barWidth = width / numBands;
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#0D1C16');
        grad.addColorStop(0.3, '#10B981');
        grad.addColorStop(0.7, '#84CC16');
        grad.addColorStop(1, '#EF4444');

        for (let i = 0; i < numBands; i++) {
          const val = currentSpectrum[i];
          const barHeight = val * (height - 30);
          const x = i * barWidth;
          const y = height - barHeight;

          if (i <= 14 && chainsaws > 0) {
            ctx.fillStyle = '#F59E0B';
          } else if (val > 0.85) {
            ctx.fillStyle = '#EF4444';
          } else {
            ctx.fillStyle = grad;
          }

          ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.25);
        ctx.lineTo(width, height * 0.25);
        ctx.moveTo(0, height * 0.5);
        ctx.lineTo(width, height * 0.5);
        ctx.moveTo(0, height * 0.75);
        ctx.lineTo(width, height * 0.75);
        ctx.stroke();

      } else if (mode === 'oscilloscope') {
        // Oscilloscope acoustic waveform
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = gunshots > 0 ? '#EF4444' : chainsaws > 0 ? '#F59E0B' : '#10B981';
        ctx.beginPath();

        const sliceWidth = width / numBands;
        let x = 0;

        for (let i = 0; i < numBands; i++) {
          const v = currentSpectrum[i];
          const oscillation = Math.sin(phase * 4 + i * 0.3) * (v * (height / 2.5));
          const y = height / 2 + oscillation;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();

        // Glow pass
        ctx.lineWidth = 6;
        ctx.strokeStyle = gunshots > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
        ctx.stroke();
      }

      // Overlay Forensic Frequency Band Annotations
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('100Hz - 500Hz Anthrophony', 12, height - 12);
      ctx.fillText('2kHz - 8kHz Tropical Biophony (Aves/Anura)', width * 0.32, height - 12);
      ctx.fillText('12kHz Orthoptera/Bat Ultrasonic', width - 210, height - 12);

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [mode, ndsiScore, gunshots, chainsaws]);

  return (
    <div className="relative rounded-2xl bg-canopy-950 border border-canopy-700/80 overflow-hidden shadow-hud">
      {/* Visualizer Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-canopy-900/90 border-b border-canopy-700/80">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-bio-thriving animate-pulse" />
            <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
              Rainforest Audio Spectrogram
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canopy-800 text-bio-muted border border-canopy-700">
            {statusText}
          </span>
          {gunshots > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-bio-crisis/20 text-bio-crisis border border-bio-crisis/40 animate-pulse font-bold">
              <ShieldAlert className="w-3 h-3" />
              POACHING IMPULSE ACTIVE
            </span>
          )}
          {chainsaws > 0 && gunshots === 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-bio-amber/20 text-bio-amber border border-bio-amber/40 font-bold">
              <Zap className="w-3 h-3" />
              ANTHROPIC HARMONIC DETECTED
            </span>
          )}
        </div>

        {/* Mode Switchers */}
        <div className="flex items-center gap-1 bg-canopy-950 p-1 rounded-xl border border-canopy-700/70">
          <button
            onClick={() => setMode('waterfall')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              mode === 'waterfall'
                ? 'bg-bio-thriving text-canopy-950 font-bold shadow-sm'
                : 'text-bio-muted hover:text-white'
            }`}
          >
            <Waves className="w-3 h-3" />
            <span>Waterfall</span>
          </button>
          <button
            onClick={() => setMode('fft')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              mode === 'fft'
                ? 'bg-bio-thriving text-canopy-950 font-bold shadow-sm'
                : 'text-bio-muted hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>FFT Bands</span>
          </button>
          <button
            onClick={() => setMode('oscilloscope')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              mode === 'oscilloscope'
                ? 'bg-bio-thriving text-canopy-950 font-bold shadow-sm'
                : 'text-bio-muted hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Oscilloscope</span>
          </button>
        </div>
      </div>

      {/* HTML5 Canvas */}
      <div className="w-full relative h-[240px] bg-canopy-950">
        <canvas ref={canvasRef} className="w-full h-full block" />
        {/* Subtle Scanline Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-bio-thriving/5 to-transparent opacity-30 animate-scan" />
      </div>

      {/* Sensor Metadata Ribbon */}
      <div className="px-4 py-2 bg-canopy-900/60 border-t border-canopy-700/80 flex items-center justify-between text-[11px] font-mono text-bio-muted">
        <div className="flex items-center gap-4">
          <span>Sampling: 48.0 kHz / 24-bit PCM</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Telemetry: AudioMoth DePIN Mesh</span>
          <span className="hidden sm:inline">•</span>
          <span>SPL Decibel: {(46 + (ndsiScore * 0.22)).toFixed(1)} dB</span>
        </div>
        <div className="flex items-center gap-2 text-bio-thriving">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>LIVE GENVM STREAM</span>
        </div>
      </div>
    </div>
  );
};
