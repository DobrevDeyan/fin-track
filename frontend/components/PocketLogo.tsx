"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface PocketLogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function PocketLogo({ width = 28, height = 28, className = "w-6 h-6", priority }: PocketLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isLight = !mounted || resolvedTheme === "light"
  const src = isLight ? "/icons/pocket_light.svg" : "/icons/pocket_dark.svg"

  return (
    <Image
      src={src}
      alt="Pocket Logo"
      width={width}
      height={height}
      className={`${className} rounded-md ${isLight ? "ring-1 ring-black/10" : "ring-1 ring-white/20"}`}
      priority={priority}
    />
  )
}
