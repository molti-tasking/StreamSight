'use client';

import Navigation from '@/components/Navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <div className="w-full flex flex-1" style={{ overflow: "overlay" }}>
        {children}
      </div>
    </>
  );
}