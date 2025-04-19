"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  IconMap
} from "../../components/ui/toast"
import { useToast } from "../../components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = variant ? IconMap[variant as keyof typeof IconMap] : null;
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex">
              {icon && <div className="mr-3 flex-shrink-0 pt-0.5">{icon}</div>}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
} 