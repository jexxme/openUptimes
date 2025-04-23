import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { XIcon, RotateCcwIcon } from 'lucide-react';

interface SetupModeToggleProps {
  className?: string;
}

export function SetupModeToggle({ className = '' }: SetupModeToggleProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showToggle, setShowToggle] = useState(process.env.NODE_ENV === 'development');
  
  // Only show this component in development mode
  if (!showToggle) return null;
  
  async function resetSetup() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dev/reset-setup', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset setup');
      }
      
      // Reload the page to see changes
      router.refresh();
      window.location.href = '/setup';
    } catch (error) {
      console.error('Error resetting setup:', error);
      alert('Failed to reset setup. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="bg-background border-border shadow-lg overflow-hidden w-60">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-semibold uppercase">Dev Tools</CardTitle>
          <Button 
            onClick={() => setShowToggle(false)}
            variant="ghost" 
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-3 pt-0">
          <Button
            onClick={resetSetup}
            disabled={isLoading}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"></div>
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RotateCcwIcon className="mr-1 h-3.5 w-3.5" />
                Reset Setup
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 