import { config } from "@/lib/config";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-gray-50 py-4 text-center text-xs text-gray-400">
      <div className="mx-auto max-w-3xl px-4">
        <p>
          © {currentYear} {config.siteName}
        </p>
      </div>
    </footer>
  );
} 