import { config } from "@/lib/config";
import { useAppearanceSettings } from "../hooks/useAppearanceSettings";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { settings } = useAppearanceSettings();
  
  // Use custom copyright text if available, otherwise use default format
  let copyrightText = settings.copyrightText || `© ${currentYear} ${config.siteName}`;
  
  // Replace {year} placeholder with the current year
  copyrightText = copyrightText.replace(/{year}/g, currentYear.toString());
  
  return (
    <footer className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
      <div className="mx-auto max-w-3xl px-4">
        <p>
          {settings.copyrightUrl ? (
            <a href={settings.copyrightUrl} className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors" target="_blank" rel="noopener noreferrer">
              {copyrightText}
            </a>
          ) : (
            <>{copyrightText}</>
          )}
        </p>
      </div>
    </footer>
  );
} 