import { useState, useEffect } from 'react';

export type ViewMode = 'auto' | 'mobile' | 'desktop';

const STORAGE_KEY = 'factory_app_view_mode';

export function useResponsiveView() {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'mobile' || saved === 'desktop' || saved === 'auto') {
      return saved as ViewMode;
    }
    return 'auto';
  });

  const [windowWidth, setWindowWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  // Determine effective isMobile state
  const isMobile = viewMode === 'mobile' 
    ? true 
    : viewMode === 'desktop' 
      ? false 
      : windowWidth < 768;

  return {
    isMobile,
    viewMode,
    setViewMode,
    windowWidth
  };
}
