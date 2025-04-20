'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugLandingPage() {
  const router = useRouter();

  // Redirect to Ping Debug page since Debug Home is no longer used
  useEffect(() => {
    router.replace('/debug/ping');
  }, [router]);

  return null;
} 