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
  // Set default engine to "mistral-ocr" as requested
  React.useEffect(() => {
    // Only set if the engine isn't already set to mistral-ocr
    if (engine !== "mistral-ocr") {
      onChange("mistral-ocr" as EngineType);
    }
  }, [engine, onChange]);

  // This component doesn't render any visible UI elements
  return null;
};
