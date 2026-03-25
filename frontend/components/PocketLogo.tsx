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

  const src = !mounted || resolvedTheme === "light"
    ? "/icons/logo_pocket_light.svg"
    : "/icons/logo_pocket_dark.svg"

  return (
    <Image
      src={src}
      alt="Pocket Logo"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
