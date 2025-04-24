"use client";

import { useTheme } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-foreground rounded-md transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={14} />
      ) : (
        <Sun size={14} />
      )}
    </button>
  );
} 