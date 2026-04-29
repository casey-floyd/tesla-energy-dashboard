"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <Sun
        className={`w-3.5 h-3.5 transition-colors ${isDark ? "text-slate-500" : "text-amber-400"}`}
        strokeWidth={1.5}
      />
      <div
        className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
          isDark ? "bg-slate-600" : "bg-slate-200"
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isDark ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </div>
      <Moon
        className={`w-3.5 h-3.5 transition-colors ${isDark ? "text-blue-400" : "text-slate-300"}`}
        strokeWidth={1.5}
      />
    </button>
  )
}
