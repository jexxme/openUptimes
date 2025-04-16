'use client';

import { ReactNode } from 'react';
import { CustomCSS } from './CustomCSS';
import { CustomHeader } from './CustomHeader';
import { RedisInitializer } from './RedisInitializer';
import { Toaster } from './ui/toaster';
import { Favicon } from './Favicon';

// This component wraps all client-side functionality to keep the root layout as a server component
export function ClientHooks({ children }: { children: ReactNode }) {
  return (
    <>
      <Favicon />
      <CustomCSS />
      <CustomHeader />
      <RedisInitializer />
      {children}
      <Toaster />
    </>
  );
} 