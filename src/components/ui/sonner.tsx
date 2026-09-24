"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "@/hooks/use-theme-state"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useTheme()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const sync = () => {
      const visible = root.querySelector("[data-sonner-toast]")
      if (visible) {
        root.removeAttribute("aria-hidden")
        root.setAttribute("aria-label", "Status messages")
      } else {
        root.setAttribute("aria-hidden", "true")
        root.removeAttribute("aria-label")
      }
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      ref={ref}
      theme={theme}
      hotkey={[]}
      containerAriaLabel="Status messages"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
