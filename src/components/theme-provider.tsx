import { useEffect, useState } from "react"
import { Theme, ThemeProviderContext } from "./theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
    const themeColor = window.document.querySelector<HTMLMetaElement>(
      "#app-theme-color"
    )

    const applyTheme = () => {
      const resolvedTheme =
        theme === "system" ? (systemTheme.matches ? "dark" : "light") : theme

      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
      root.style.colorScheme = resolvedTheme
      themeColor?.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#0a0a0a" : "#ffffff"
      )
    }

    applyTheme()
    if (theme === "system") systemTheme.addEventListener("change", applyTheme)

    return () => systemTheme.removeEventListener("change", applyTheme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
