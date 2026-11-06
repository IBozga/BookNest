import React, { useEffect, useState } from 'react';
import { loadingState } from '../services/api';

/**
 * Thin progress bar pinned to the very top of the viewport.
 * Appears whenever any API request is in flight and fades out on completion.
 */
export const GlobalLoadingBar: React.FC = () => {
  const [visible, setVisible] = useState(loadingState.isLoading);

  useEffect(() => {
    return loadingState.subscribe(setVisible);
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={!visible}
      className={`fixed top-0 left-0 right-0 z-[9999] h-0.5 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="h-full bg-stone-900 animate-loading-bar" />
    </div>
  );
};
