interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-black text-white text-xs rounded p-1.5 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 pointer-events-none shadow-md">
        {text}
        <svg className="absolute text-gray-900 dark:text-black h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
          <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
        </svg>
      </div>
    </div>
  );
} 