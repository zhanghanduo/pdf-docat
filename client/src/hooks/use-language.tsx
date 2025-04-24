import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type Language = 'zh-CN' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const defaultLanguage: Language = 'zh-CN';

// Create a context with a default value
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// The translations object
const translations: Record<string, Record<string, string>> = {
  'en': {
    // Navigation
    'dashboard': 'Dashboard',
    'history': 'History',
    'settings': 'Settings',
    
    // Dashboard page
    'pdf_extraction': 'PDF Content Extraction',
    'upload_description': 'Upload your PDF to extract structured content using advanced AI technology.',
    'document_processing': 'Document Processing',
    'upload_instruction': 'Upload a PDF file to extract text, tables, and structured content.',
    'smart_detection': 'Smart Detection',
    'detection_description': 'DocCat will automatically determine if your PDF contains scanned images or structured text and apply the optimal processing method.',
    'process_document': 'Process Document',
    'processing_complete': 'Processing complete',
    'processing_time': 'Your PDF has been successfully processed in {0} seconds',
    
    // Extract content
    'extracted_content': 'Extracted Content',
    'content_extracted': 'Content extracted from your document',
    'with_translation': '(with translation)',
    'export_txt': 'Export as TXT',
    'export_md': 'Export as MD',
    'export_json': 'Export as JSON',
    'process_another': 'Process Another',
    'enhanced_view': 'Enhanced View',
    'classic_view': 'Classic View',
    
    // Document info
    'document_info': 'Document Information',
    'file_name': 'File Name',
    'pages': 'Pages',
    'word_count': 'Word Count',
    'confidence': 'Confidence',
    'processing_duration': 'Processing Time',
    'seconds': 'seconds',
    'source_language': 'Source Language',
    'target_language': 'Target Language',
    
    // Translation options
    'translation_options': 'Translation Options',
    'enable_translation': 'Enable Translation',
    'target_language_label': 'Target Language',
    'dual_language': 'Dual Language View',
    
    // Cache notification
    'duplicate_document': 'Duplicate Document Detected',
    'using_cached': 'This file was previously processed. Using cached results (completed in {0} seconds)',
    
    // Processing status
    'uploading': 'Uploading',
    'processing': 'Processing',
    'completed': 'Completed',
    'error': 'Error',
    
    // Languages
    'english': 'English',
    'simplified_chinese': 'Simplified Chinese',
    'traditional_chinese': 'Traditional Chinese',
    'japanese': 'Japanese',
    'german': 'German',
    'spanish': 'Spanish',
    'french': 'French',
    
    // Misc
    'no_file': 'No file selected',
    'please_upload': 'Please upload a PDF file to process',
    'login': 'Login',
    'logout': 'Logout',
    'logged_out': 'Logged out successfully',
    'logout_message': 'You have been logged out of your account',
    'switch_language': 'Language'
  },
  'zh-CN': {
    // Navigation
    'dashboard': '仪表板',
    'history': '历史记录',
    'settings': '设置',
    
    // Dashboard page
    'pdf_extraction': 'PDF 内容提取',
    'upload_description': '上传您的 PDF 以使用先进的 AI 技术提取结构化内容。',
    'document_processing': '文档处理',
    'upload_instruction': '上传 PDF 文件以提取文本、表格和结构化内容。',
    'smart_detection': '智能检测',
    'detection_description': 'DocCat 将自动确定您的 PDF 是包含扫描图像还是结构化文本，并应用最佳处理方法。',
    'process_document': '处理文档',
    'processing_complete': '处理完成',
    'processing_time': '您的 PDF 已成功处理，耗时 {0} 秒',
    
    // Extract content
    'extracted_content': '提取的内容',
    'content_extracted': '从您的文档中提取的内容',
    'with_translation': '（带翻译）',
    'export_txt': '导出为 TXT',
    'export_md': '导出为 MD',
    'export_json': '导出为 JSON',
    'process_another': '处理另一个',
    'enhanced_view': '增强视图',
    'classic_view': '经典视图',
    
    // Document info
    'document_info': '文档信息',
    'file_name': '文件名',
    'pages': '页数',
    'word_count': '字数',
    'confidence': '置信度',
    'processing_duration': '处理时间',
    'seconds': '秒',
    'source_language': '源语言',
    'target_language': '目标语言',
    
    // Translation options
    'translation_options': '翻译选项',
    'enable_translation': '启用翻译',
    'target_language_label': '目标语言',
    'dual_language': '双语视图',
    
    // Cache notification
    'duplicate_document': '检测到重复文档',
    'using_cached': '此文件之前已处理过。使用缓存结果（完成时间 {0} 秒）',
    
    // Processing status
    'uploading': '上传中',
    'processing': '处理中',
    'completed': '已完成',
    'error': '错误',
    
    // Languages
    'english': '英语',
    'simplified_chinese': '简体中文',
    'traditional_chinese': '繁体中文',
    'japanese': '日语',
    'german': '德语',
    'spanish': '西班牙语',
    'french': '法语',
    
    // Misc
    'no_file': '未选择文件',
    'please_upload': '请上传 PDF 文件进行处理',
    'login': '登录',
    'logout': '退出登录',
    'logged_out': '成功退出登录',
    'logout_message': '您已退出您的账户',
    'switch_language': '语言'
  }
};

// Helper function to format strings with parameters
function formatString(str: string, ...args: string[]): string {
  return str.replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined' ? args[number] : match;
  });
}

// Provider component that wraps the app
export const LanguageProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // Try to get the stored language from localStorage
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLanguage = typeof window !== 'undefined' 
      ? localStorage.getItem('language') as Language 
      : null;
    return storedLanguage || defaultLanguage;
  });

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Function to set the language
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  // Translation function
  const t = (key: string, ...args: string[]): string => {
    const translation = translations[language]?.[key] || key;
    if (args.length > 0) {
      return formatString(translation, ...args);
    }
    return translation;
  };

  const value = { language, setLanguage, t };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};