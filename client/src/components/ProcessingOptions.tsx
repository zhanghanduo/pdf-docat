import React from "react";
import { EngineType } from "@shared/schema";

interface ProcessingOptionsProps {
  engine: EngineType;
  onChange: (engine: EngineType) => void;
  disabled?: boolean;
}

// This component is now "invisible" in the UI but still manages the engine state
// It defaults to "auto" mode, which will be handled on the server side
export const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({
  engine,
  onChange,
}) => {
  // Set default engine to "auto" which we'll handle in the backend logic
  React.useEffect(() => {
    // Only set if the engine isn't already set to auto
    if (engine !== "auto") {
      onChange("auto" as EngineType);
    }
  }, [engine, onChange]);

  // This component doesn't render any visible UI elements
  return null;
};
