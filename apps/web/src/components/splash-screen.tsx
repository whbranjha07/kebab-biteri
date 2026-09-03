'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Start fading after 1.2s and hide completely after 1.7s
    const fadeTimer = setTimeout(() => {
      setFading(true)
    }, 1200)

    const removeTimer = setTimeout(() => {
      setVisible(false)
    }, 1700)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#18181B] via-zinc-900 to-zinc-950 px-6 py-12 transition-all duration-700 ease-out select-none',
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100',
      )}
    >
      {/* Top ambient glow */}
      <div className="absolute top-1/4 h-72 w-72 rounded-full bg-[#F4BE2C]/20 blur-3xl animate-pulse" />

      <div className="w-full flex justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#F4BE2C] backdrop-blur-md border border-white/10">
          <Sparkles className="h-3.5 w-3.5 text-[#F4BE2C]" /> Premium Quality
        </span>
      </div>

      {/* Main Brand Logo Center Container */}
      <div className="relative flex flex-col items-center text-center">
        {/* Animated Brand Emblem Circle */}
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-tr from-[#F4BE2C] via-amber-300 to-[#E50909] p-1.5 shadow-2xl shadow-[#F4BE2C]/30 animate-bounce-short">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950 p-2 shadow-inner border border-white/10">
            <svg
              viewBox="0 0 48 48"
              className="h-16 w-16 drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* House outline */}
              <path
                d="M24 6 L8 18 L13 18 L13 40 L35 40 L35 18 L40 18 Z"
                stroke="#F4BE2C"
                strokeWidth="3.5"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Doner Spit Center Axis */}
              <line x1="24" y1="12" x2="24" y2="38" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              {/* Kebab Meat Layers */}
              <path d="M17 18 C17 16.5, 31 16.5, 31 18 L29 24 L19 24 Z" fill="#E50909" />
              <path d="M18.5 25 L29.5 25 L28 31 L20 31 Z" fill="#E50909" />
              <path d="M20 32 L28 32 L26.5 37 L21.5 37 Z" fill="#E50909" />
              {/* Flame icon accent */}
              <path d="M24 9 Q22 12 24 14 Q26 12 24 9 Z" fill="#F4BE2C" />
            </svg>
          </div>
        </div>

        {/* Brand Name with Metallic Gold Glow */}
        <h1 className="font-sans text-4xl font-black italic tracking-tight text-white drop-shadow-md">
          Kebab <span className="text-[#F4BE2C]">Biteri</span>
        </h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-200/80 flex items-center gap-1.5 justify-center">
          <Flame className="h-3.5 w-3.5 text-[#E50909] fill-[#E50909]" /> Authentic Doner & Wraps
        </p>
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="w-full max-w-xs space-y-3 flex flex-col items-center">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5 backdrop-blur-xs">
          <div className="h-full rounded-full bg-gradient-to-r from-[#E50909] via-[#F4BE2C] to-amber-300 transition-all duration-1000 ease-out w-full animate-pulse" />
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
          Loading Delicious Taste...
        </p>
      </div>
    </div>
  )
}
