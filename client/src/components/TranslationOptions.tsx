import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TargetLanguage, targetLanguages } from "@shared/schema";

interface TranslationOptionsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  targetLanguage: TargetLanguage;
  onTargetLanguageChange: (language: TargetLanguage) => void;
  dualLanguage: boolean;
  onDualLanguageChange: (dualLanguage: boolean) => void;
  disabled?: boolean;
}

export const TranslationOptions: React.FC<TranslationOptionsProps> = ({
  enabled,
  onEnabledChange,
  targetLanguage,
  onTargetLanguageChange,
  dualLanguage,
  onDualLanguageChange,
  disabled = false,
}) => {
  // Map of language codes to readable names
  const languageNames: Record<TargetLanguage, string> = {
    "english": "English",
    "simplified-chinese": "Simplified Chinese",
    "traditional-chinese": "Traditional Chinese",
    "german": "German",
    "japanese": "Japanese",
    "spanish": "Spanish",
    "french": "French",
  };

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Translation Options</h4>
          <p className="text-xs text-gray-500">Translate extracted content to your preferred language</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="translation-toggle" className="text-sm text-gray-700">
            Enable Translation
          </Label>
          <Switch
            id="translation-toggle"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            disabled={disabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="target-language" className="text-sm text-gray-700">
                Target Language
              </Label>
              <Select
                disabled={disabled}
                value={targetLanguage}
                onValueChange={(value) => onTargetLanguageChange(value as TargetLanguage)}
              >
                <SelectTrigger id="target-language" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {targetLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {languageNames[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="dual-language-toggle" className="text-sm text-gray-700">
                Dual Language (Show Original Text)
              </Label>
              <Switch
                id="dual-language-toggle"
                checked={dualLanguage}
                onCheckedChange={onDualLanguageChange}
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};