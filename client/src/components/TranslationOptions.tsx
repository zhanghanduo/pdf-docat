import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TargetLanguage, targetLanguages } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";

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
  const { t } = useLanguage();
  
  // Map of language codes to translation keys
  const languageKeys: Record<TargetLanguage, string> = {
    "english": "english",
    "simplified-chinese": "simplified_chinese",
    "traditional-chinese": "traditional_chinese",
    "german": "german",
    "japanese": "japanese",
    "spanish": "spanish",
    "french": "french",
  };

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900">{t('translation_options')}</h4>
          <p className="text-xs text-gray-500">{t('enable_translation')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="translation-toggle" className="text-sm text-gray-700">
            {t('enable_translation')}
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
                {t('target_language_label')}
              </Label>
              <Select
                disabled={disabled}
                value={targetLanguage}
                onValueChange={(value) => onTargetLanguageChange(value as TargetLanguage)}
              >
                <SelectTrigger id="target-language" className="w-full">
                  <SelectValue placeholder={t('target_language_label')} />
                </SelectTrigger>
                <SelectContent>
                  {targetLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {t(languageKeys[lang])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="dual-language-toggle" className="text-sm text-gray-700">
                {t('dual_language')}
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