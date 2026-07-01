/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Characters list (Japanese Katakana, numbers, and hacking-themed symbols)
    const katakana = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
    const numbers = '0123456789';
    const symbols = '#*$%+-<>[]{}@_';
    const alphabet = katakana + numbers + symbols;

    const fontSize = 14;
    let columns = Math.floor(width / fontSize);

    // Rain drop states
    // Each element in the array represents the y coordinate of the drop for that column
    let rainDrops: number[] = Array(columns).fill(1).map(() => Math.floor(Math.random() * -100));
    let speeds: number[] = Array(columns).fill(1).map(() => 0.25 + Math.random() * 0.45);
    let chars: string[] = Array(columns).fill('').map(() => alphabet[Math.floor(Math.random() * alphabet.length)]);

    // Handle Resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      const newColumns = Math.floor(width / fontSize);
      const newDrops = Array(newColumns).fill(1).map(() => Math.floor(Math.random() * -100));
      const newSpeeds = Array(newColumns).fill(1).map(() => 0.25 + Math.random() * 0.45);
      const newChars = Array(newColumns).fill('').map(() => alphabet[Math.floor(Math.random() * alphabet.length)]);

      // Preserve existing positions if possible, or backfill
      for (let i = 0; i < Math.min(columns, newColumns); i++) {
        newDrops[i] = rainDrops[i];
        newSpeeds[i] = speeds[i];
        newChars[i] = chars[i];
      }

      columns = newColumns;
      rainDrops = newDrops;
      speeds = newSpeeds;
      chars = newChars;
    };

    window.addEventListener('resize', handleResize);

    // Glitch State Parameters
    let glitchActive = false;
    let glitchDuration = 0;
    let glitchY = 0;
    let glitchHeight = 0;

    const draw = () => {
      // Semi-transparent black background to create the fade-away tail effect
      ctx.fillStyle = 'rgba(3, 10, 5, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Periodically trigger a full-screen glitch line or flash
      if (!glitchActive && Math.random() < 0.003) {
        glitchActive = true;
        glitchDuration = 5 + Math.floor(Math.random() * 15); // frames
        glitchY = Math.random() * height;
        glitchHeight = 10 + Math.random() * 50;
      }

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < rainDrops.length; i++) {
        // Occasionally randomize characters during fall
        if (Math.random() > 0.98) {
          chars[i] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }

        const x = i * fontSize;
        const y = rainDrops[i] * fontSize;

        // Draw character
        // Highlight the lead character with bright neon white/green
        const isLead = Math.random() > 0.96;
        if (isLead) {
          ctx.fillStyle = '#e6fffa';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 8;
        } else if (rainDrops[i] < 10) {
          // Darker green at start
          ctx.fillStyle = '#064e3b';
          ctx.shadowBlur = 0;
        } else {
          // Standard bright hacking emerald
          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = 0;
        }

        ctx.fillText(chars[i], x, y);

        // Move drop
        rainDrops[i] += speeds[i];

        // Reset drop when it reaches bottom with a random delay offset
        if (y > height && Math.random() > 0.975) {
          rainDrops[i] = Math.floor(Math.random() * -20);
          speeds[i] = 0.25 + Math.random() * 0.45;
        }
      }

      // Draw custom cyberpunk Glitch overlay if active
      if (glitchActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fillRect(0, glitchY, width, glitchHeight);

        // Render shifted text inside glitch slice
        ctx.fillStyle = '#ef4444'; // Red glitch highlight
        ctx.font = `bold ${fontSize + 2}px monospace`;
        for (let i = 0; i < rainDrops.length; i++) {
          const x = i * fontSize + (Math.random() * 10 - 5);
          const y = rainDrops[i] * fontSize;
          if (y > glitchY && y < glitchY + glitchHeight) {
            ctx.fillText(alphabet[Math.floor(Math.random() * alphabet.length)], x, y);
          }
        }
        ctx.restore();

        glitchDuration--;
        if (glitchDuration <= 0) {
          glitchActive = false;
        }
      }

      // Occasional scanline flicker effect
      if (Math.random() < 0.05) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.01)';
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      id="matrix-rain-canvas"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0 bg-[#030704]"
    />
  );
}
