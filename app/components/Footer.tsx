import { config } from "@/lib/config";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-gray-50 py-4 text-center text-xs text-gray-400">
      <div className="mx-auto max-w-3xl px-4 flex justify-between items-center">
        <p>
          © {currentYear} {config.siteName}
        </p>
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
          Admin
        </Link>
      </div>
    </footer>
  );
} 