"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// CSS for custom scrollbar styling
const applyScrollbarStyles = (isDark: boolean) => {
  const style = document.createElement('style');
  style.id = 'custom-scrollbar-styles';
  
  // Remove existing style if present
  const existingStyle = document.getElementById('custom-scrollbar-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Scrollbar colors based on theme
  const colors = isDark 
    ? {
        thumb: 'rgba(255, 255, 255, 0.2)',
        thumbHover: 'rgba(255, 255, 255, 0.3)',
        track: 'rgba(0, 0, 0, 0.2)',
      }
    : {
        thumb: 'rgba(0, 0, 0, 0.2)',
        thumbHover: 'rgba(0, 0, 0, 0.3)',
        track: 'rgba(0, 0, 0, 0.05)',
      };
  
  style.textContent = `
    /* Webkit browsers (Chrome, Safari, Edge) */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: ${colors.track};
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: ${colors.thumb};
      border-radius: 4px;
      transition: background 0.2s ease;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: ${colors.thumbHover};
    }
    
    /* Firefox */
    * {
      scrollbar-width: thin;
      scrollbar-color: ${colors.thumb} ${colors.track};
    }
  `;
  
  document.head.appendChild(style);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem("openuptimes-theme") as Theme;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Set initial theme based on saved preference or system setting
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    
    // Apply theme to document
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
      applyScrollbarStyles(true);
    } else {
      document.documentElement.classList.remove("dark");
      applyScrollbarStyles(false);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      
      // Save to localStorage
      localStorage.setItem("openuptimes-theme", newTheme);
      
      // Apply to document
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
        applyScrollbarStyles(true);
      } else {
        document.documentElement.classList.remove("dark");
        applyScrollbarStyles(false);
      }
      
      return newTheme;
    });
  };

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
      localStorage.setItem("openuptimes-theme", newTheme);
      
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
        applyScrollbarStyles(true);
      } else {
        document.documentElement.classList.remove("dark");
        applyScrollbarStyles(false);
      }
    },
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
} 