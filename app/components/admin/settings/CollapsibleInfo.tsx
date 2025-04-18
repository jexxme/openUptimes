import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleInfoProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  contentClassName?: string;
  iconColor?: string;
}

export function CollapsibleInfo({
  title,
  children,
  className = "",
  buttonClassName = "",
  contentClassName = "",
  iconColor = "text-blue-500"
}: CollapsibleInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
        <Info className={`h-3.5 w-3.5 ${iconColor} flex-shrink-0`} />
        <button 
          type="button" 
          onClick={() => setIsOpen(!isOpen)}
          className={`text-blue-500 hover:text-blue-700 flex items-center ${buttonClassName}`}
          aria-expanded={isOpen}
        >
          <span>{isOpen ? `Hide ${title}` : `Show ${title}`}</span>
          <span className="inline-flex ml-1">
            {isOpen ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
      </p>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
        } ${contentClassName}`}
      >
        <div className="bg-gray-50 dark:bg-gray-900 p-3 sm:p-5 rounded border border-gray-200 dark:border-gray-800 text-xs">
          {children}
        </div>
      </div>
    </div>
  );
} 