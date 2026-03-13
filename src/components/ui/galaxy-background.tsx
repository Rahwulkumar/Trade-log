"use client";

import { useEffect, useRef } from "react";

/**
 * Full-viewport galaxy/space-style background. Renders behind nav and content (z-0).
 */
export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener("resize", setSize);

    const dots: { x: number; y: number; r: number; opacity: number }[] = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }

    let frame = 0;
    const loop = () => {
      frame++;
      ctx.fillStyle = "rgb(3, 5, 12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.3,
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      );
      gradient.addColorStop(0, "rgba(30, 20, 60, 0.25)");
      gradient.addColorStop(0.5, "rgba(15, 10, 35, 0.1)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      dots.forEach((d, i) => {
        const twinkle = 0.7 + 0.3 * Math.sin((frame * 0.02 + i * 0.5) % (Math.PI * 2));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${d.opacity * twinkle})`;
        ctx.fill();
      });

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", setSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 h-full w-full"
      aria-hidden
    />
  );
}
