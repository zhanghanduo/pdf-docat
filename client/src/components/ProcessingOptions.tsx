import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { EngineType } from "@shared/schema";

interface ProcessingOptionsProps {
  engine: EngineType;
  onChange: (engine: EngineType) => void;
  disabled?: boolean;
}

export const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({
  engine,
  onChange,
  disabled = false,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Processing Options</h4>
          <p className="text-xs text-gray-500">Choose how to process your document</p>
        </div>
      </div>

      <RadioGroup
        value={engine}
        onValueChange={onChange as (value: string) => void}
        className="mt-2 space-y-3"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="engine-mistral" value="mistral-ocr" />
          <Label htmlFor="engine-mistral" className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Mistral OCR</span>
            <span className="text-xs text-gray-500">
              Best for scanned documents or PDFs with images ($2 per 1,000 pages)
            </span>
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="engine-text" value="pdf-text" />
          <Label htmlFor="engine-text" className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">PDF Text</span>
            <span className="text-xs text-gray-500">
              Best for well-structured PDFs with clear text content (Free)
            </span>
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem id="engine-native" value="native" />
          <Label htmlFor="engine-native" className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Native</span>
            <span className="text-xs text-gray-500">
              Use model's native file processing (charged as input tokens)
            </span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
