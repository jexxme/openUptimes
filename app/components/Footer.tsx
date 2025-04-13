import { config } from "@/lib/config";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-16 border-t border-gray-100 py-6 text-center text-sm text-gray-500">
      <div className="mx-auto max-w-5xl px-4">
        <p>
          © {currentYear} {config.siteName} | Powered by{" "}
          <a
            href="https://github.com/your-username/openuptimes"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 hover:underline"
          >
            OpenUptimes
          </a>
        </p>
      </div>
    </footer>
  );
} 