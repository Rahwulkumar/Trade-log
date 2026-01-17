"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
  active: boolean;
}

interface FloatingParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  color: string;
}

export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const particlesRef = useRef<FloatingParticle[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const { theme } = useTheme();

  useEffect(() => {
    // Don't run animation in light mode
    if (theme === "light") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initElements();
    };

    const initElements = () => {
      const stars: Star[] = [];
      const starCount = Math.floor((canvas.width * canvas.height) / 5000);

      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.2 + 0.3,
          baseOpacity: Math.random() * 0.4 + 0.1,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = stars;

      shootingStarsRef.current = Array(3).fill(null).map(() => ({
        x: 0,
        y: 0,
        length: 0,
        speed: 0,
        opacity: 0,
        angle: 0,
        active: false,
      }));

      const particles: FloatingParticle[] = [];
      const particleCount = 15;
      const colors = [
        "99, 102, 241",
        "59, 130, 246",
        "139, 92, 246",
      ];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 150 + 80,
          opacity: Math.random() * 0.03 + 0.01,
          speedX: (Math.random() - 0.5) * 0.15,
          speedY: (Math.random() - 0.5) * 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      particlesRef.current = particles;
    };

    const spawnShootingStar = (star: ShootingStar) => {
      star.x = Math.random() * canvas.width * 0.8;
      star.y = Math.random() * canvas.height * 0.4;
      star.length = Math.random() * 80 + 40;
      star.speed = Math.random() * 8 + 4;
      star.opacity = Math.random() * 0.4 + 0.2;
      star.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      star.active = true;
    };

    const drawStar = (star: Star, time: number) => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
      const opacity = star.baseOpacity * (0.6 + twinkle * 0.4);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, opacity)})`;
      ctx.fill();
    };

    const drawShootingStar = (star: ShootingStar) => {
      if (!star.active) return;

      const endX = star.x + Math.cos(star.angle) * star.length;
      const endY = star.y + Math.sin(star.angle) * star.length;

      const gradient = ctx.createLinearGradient(star.x, star.y, endX, endY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
      gradient.addColorStop(0.3, `rgba(200, 220, 255, ${star.opacity * 0.6})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();
    };

    const updateShootingStar = (star: ShootingStar) => {
      if (!star.active) return;

      star.x += Math.cos(star.angle) * star.speed;
      star.y += Math.sin(star.angle) * star.speed;
      star.opacity *= 0.98;

      if (star.x > canvas.width || star.y > canvas.height || star.opacity < 0.01) {
        star.active = false;
      }
    };

    const drawParticle = (particle: FloatingParticle) => {
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size
      );
      gradient.addColorStop(0, `rgba(${particle.color}, ${particle.opacity})`);
      gradient.addColorStop(0.5, `rgba(${particle.color}, ${particle.opacity * 0.3})`);
      gradient.addColorStop(1, `rgba(${particle.color}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    };

    const updateParticle = (particle: FloatingParticle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < -particle.size) particle.x = canvas.width + particle.size;
      if (particle.x > canvas.width + particle.size) particle.x = -particle.size;
      if (particle.y < -particle.size) particle.y = canvas.height + particle.size;
      if (particle.y > canvas.height + particle.size) particle.y = -particle.size;
    };

    const animate = () => {
      timeRef.current += 1;
      const time = timeRef.current;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        drawParticle(particle);
        updateParticle(particle);
      });

      starsRef.current.forEach((star) => drawStar(star, time));

      shootingStarsRef.current.forEach((star) => {
        drawShootingStar(star);
        updateShootingStar(star);
      });

      if (Math.random() < 0.003) {
        const inactiveStar = shootingStarsRef.current.find(s => !s.active);
        if (inactiveStar) {
          spawnShootingStar(inactiveStar);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [theme]);

  // In light mode, return nothing - body background is white
  if (theme === "light") {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "#000" }}
    />
  );
}
