import React, { useState, useEffect, useRef } from "react";

interface ProgressDisplayProps {
  progress: number;
}

export default function ProgressDisplay({ progress }: ProgressDisplayProps) {
  // Use a reference to track and display the highest seen progress value
  const highestProgressRef = useRef<number>(progress);
  const [displayProgress, setDisplayProgress] = useState<number>(progress);

  // Update the displayed progress when the input progress changes
  useEffect(() => {
    // Only update to show higher progress values (prevents flickering and inconsistency)
    if (progress > highestProgressRef.current) {
      highestProgressRef.current = progress;
      setDisplayProgress(progress);
    } else if (progress > 0 && displayProgress === 0) {
      // Edge case: If we're showing 0 but have non-zero progress, update it
      setDisplayProgress(progress);
    }
  }, [progress, displayProgress]);

  return displayProgress;
}
