"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: [
            "font-sans text-sm rounded-xl border shadow-2xl",
            "flex gap-3 items-start p-4 pr-10",
            "bg-zinc-900 border-zinc-700/60 text-zinc-100",
            "data-[type=success]:border-emerald-500/40 data-[type=success]:bg-emerald-950/80",
            "data-[type=error]:border-red-500/40 data-[type=error]:bg-red-950/80",
            "data-[type=warning]:border-yellow-500/40 data-[type=warning]:bg-yellow-950/80",
            "data-[type=info]:border-blue-500/40 data-[type=info]:bg-blue-950/80",
          ].join(" "),
          title: "font-semibold text-sm leading-tight tracking-tight",
          description: "text-xs text-zinc-400 mt-0.5 leading-relaxed",
          icon: [
            "mt-0.5 shrink-0",
            "data-[type=success]:text-emerald-400",
            "data-[type=error]:text-red-400",
            "data-[type=warning]:text-yellow-400",
            "data-[type=info]:text-blue-400",
          ].join(" "),
          closeButton: [
            "absolute right-2 top-2 rounded-md p-1",
            "text-zinc-500 hover:text-zinc-200 transition-colors",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
          ].join(" "),
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
