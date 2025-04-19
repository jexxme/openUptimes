import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ServiceConfig } from '@/lib/config';

interface ServiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (service: ServiceConfig) => Promise<boolean>;
  service?: ServiceConfig;
  title: string;
}

export function ServiceForm({
  isOpen,
  onClose,
  onSubmit,
  service,
  title,
}: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceConfig>({
    name: '',
    url: '',
    description: '',
    expectedStatus: 200,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens or service changes
  useEffect(() => {
    if (isOpen) {
      setFormData(service || {
        name: '',
        url: '',
        description: '',
        expectedStatus: 200,
      });
      setError(null);
    }
  }, [isOpen, service]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'expectedStatus' ? parseInt(value) || undefined : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!formData.name.trim()) {
      setError('Service name is required');
      return;
    }
    
    if (!formData.url.trim()) {
      setError('Service URL is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await onSubmit(formData);
      if (success) {
        onClose();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="transition-all">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md mb-4">
              {error}
            </div>
          )}
          
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Google, GitHub, API Server"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="url" className="text-sm font-medium">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              value={formData.url}
              onChange={handleChange}
              className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              value={formData.description || ''}
              onChange={handleChange}
              className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the service"
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="expectedStatus" className="text-sm font-medium">
              Expected HTTP Status (default: 200)
            </label>
            <input
              id="expectedStatus"
              name="expectedStatus"
              type="number"
              value={formData.expectedStatus || ''}
              onChange={handleChange}
              className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="200"
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : service ? 'Update Service' : 'Add Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 