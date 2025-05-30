import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type Language = 'zh-CN' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, param?: string) => string;
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
    'usage': 'Usage & Credits',
    
    // Registration and Auth
    'registration.title': 'Create Account',
    'registration.name': 'Full name',
    'registration.namePlaceholder': 'Your name',
    'registration.email': 'Email address',
    'registration.emailPlaceholder': 'Your email',
    'registration.password': 'Password',
    'registration.passwordPlaceholder': 'Create a secure password',
    'registration.confirmPassword': 'Confirm password',
    'registration.confirmPasswordPlaceholder': 'Repeat your password',
    'registration.submit': 'Sign Up',
    'registration.submitting': 'Creating account...',
    'registration.success': 'Registration successful',
    'registration.successDesc': 'Your account has been created',
    'registration.failed': 'Registration failed',
    'registration.alreadyHaveAccount': 'Already have an account?',
    'registration.signIn': 'Sign in',
    
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
    
    // Feature introduction cards
    'feature_pdf_extraction': 'PDF Content Extraction',
    'feature_pdf_extraction_desc': 'Extract text from all types of PDF documents with high accuracy, including scanned images.',
    'feature_translation': 'Multi-language Translation',
    'feature_translation_desc': 'Seamlessly translate extracted content between multiple languages.',
    'feature_markdown': 'Structured Markdown',
    'feature_markdown_desc': 'Convert extracted content into well-structured markdown format for easy use.',
    
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
    'file_details': 'File Details',
    'file_name': 'File Name',
    'pages': 'Pages',
    'processing_details': 'Processing Details',
    'processed_on': 'Processed on',
    'at': 'at',
    'word_count': 'Word Count',
    'words': 'words',
    'confidence': 'Confidence',
    'processing_duration': 'Processing Time',
    'seconds': 'seconds',
    'engine_details': 'Engine Details',
    'model': 'Model',
    'provider': 'Provider',
    'translation_information': 'Translation Information',
    'source_language': 'Source Language',
    'target_language': 'Target Language',
    'translation_type': 'Translation type',
    'full_document': 'Full document',
    'partial': 'Partial',
    'auto_detected': 'Auto-detected',
    'processing_note': 'Processing Note',
    'extraction_issues': 'The extraction encountered some issues. Please check the content or try uploading again.',
    
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
    
    // PDF Dropzone
    'upload_pdf_document': 'Upload your PDF document',
    'drag_drop_browse': 'Drag and drop your file here, or click to browse your files',
    'select_pdf_file': 'Select PDF file',
    'pdf_file_size_limit': 'PDF files up to {0}MB supported',
    'invalid_file_type': 'Invalid file type',
    'please_upload_pdf': 'Please upload a PDF file.',
    'file_too_large': 'File too large',
    'file_size_exceeds': 'The file exceeds the maximum size of {0}MB.',
    
    // History page
    'processing_history': 'Processing History',
    'view_processed_documents': 'View your previously processed documents.',
    'recent_documents': 'Recent Documents',
    'processing_history_30days': 'Your processing history from the last 30 days.',
    'document': 'Document',
    'date': 'Date',
    'engine': 'Engine',
    'status': 'Status',
    'actions': 'Actions',
    'loading': 'Loading...',
    'error_loading_history': 'Error loading processing history',
    'no_history_found': 'No processing history found',
    'unknown_date': 'Unknown date',
    'view': 'View',
    'download': 'Download',
    'showing_page': 'Showing page {0}',
    'loading_content': 'Loading content',
    'retrieving_content': 'Retrieving document content...',
    'no_content_available': 'No content available',
    'no_extracted_content': 'This log does not have any extracted content',
    'error_title': 'Error',
    'failed_fetch_details': 'Failed to fetch log details',
    'download_started': 'Download started',
    'document_downloaded': 'Your document has been downloaded as markdown',
    'no_content_download': 'This log does not have any extracted content to download',
    'failed_download': 'Failed to download content',
    'viewing_document': 'Viewing Document: {0}',
    'document_processed_on': 'Document processed on {0}',
    
    // Usage page
    'Credit Usage Overview': 'Credit Usage Overview',
    'Credit Usage History': 'Credit Usage History',
    'Your current tier': 'Your current tier',
    'Credits used': 'Credits used',
    'Processing Costs': 'Processing Costs',
    'Scanned Documents': 'Scanned Documents',
    'Digital PDFs': 'Digital PDFs',
    'credits per document': 'credits per document',
    'Your Tier Benefits': 'Your Tier Benefits',
    'Free Tier': 'Free Tier',
    'Plus Tier': 'Plus Tier',
    'Pro Tier': 'Pro Tier',
    'No credit usage history yet': 'No credit usage history yet',
    'Process your first document to start tracking usage': 'Process your first document to start tracking usage',
    'Unable to load credit information': 'Unable to load credit information',
    'Please try again later': 'Please try again later',
    'Date': 'Date',
    'Description': 'Description', 
    'Credits': 'Credits',
    
    // Misc
    'no_file': 'No file selected',
    'please_upload': 'Please upload a PDF file to process',
    'login': 'Login',
    'logout': 'Logout',
    'logged_out': 'Logged out successfully',
    'logout_message': 'You have been logged out of your account',
    'switch_language': ''
  },
  'zh-CN': {
    // Navigation
    'dashboard': '仪表板',
    'history': '历史记录',
    'settings': '设置',
    'usage': '使用情况与额度',
    
    // Registration and Auth
    'registration.title': '创建账号',
    'registration.name': '姓名',
    'registration.namePlaceholder': '您的姓名',
    'registration.email': '电子邮箱',
    'registration.emailPlaceholder': '您的邮箱地址',
    'registration.password': '密码',
    'registration.passwordPlaceholder': '创建安全密码',
    'registration.confirmPassword': '确认密码',
    'registration.confirmPasswordPlaceholder': '再次输入密码',
    'registration.submit': '注册',
    'registration.submitting': '正在创建账号...',
    'registration.success': '注册成功',
    'registration.successDesc': '您的账号已创建成功',
    'registration.failed': '注册失败',
    'registration.alreadyHaveAccount': '已有账号？',
    'registration.signIn': '登录',
    
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
    
    // Feature introduction cards
    'feature_pdf_extraction': 'PDF内容提取',
    'feature_pdf_extraction_desc': '高精度提取各类PDF文档（包括扫描图文件）中的文本内容',
    'feature_translation': '多语言翻译',
    'feature_translation_desc': '无缝翻译提取的内容，支持多种语言之间的转换',
    'feature_markdown': '结构化Markdown',
    'feature_markdown_desc': '将提取的内容转换为结构良好的markdown格式，方便使用',
    
    // Extract content
    'extracted_content': '提取的内容',
    'content_extracted': '从您的文档中提取的内容', 
    'table_missing_data': '表格无法渲染（缺少数据）',
    'translated_table': '翻译后的表格',
    
    // PDF Dropzone
    'upload_pdf_document': '上传 PDF 文档',
    'drag_drop_browse': '拖放文件至此处，或点击浏览文件',
    'select_pdf_file': '选择 PDF 文件',
    'pdf_file_size_limit': '支持最大 {0}MB 的 PDF 文件',
    'invalid_file_type': '文件类型无效',
    'please_upload_pdf': '请上传 PDF 文件。',
    'file_too_large': '文件过大',
    'file_size_exceeds': '文件超过最大大小 {0}MB。',
    'with_translation': '（带翻译）',
    'export_txt': '导出为 TXT',
    'export_md': '导出为 MD',
    'export_json': '导出为 JSON',
    'process_another': '处理另一个',
    'enhanced_view': '增强视图',
    'classic_view': '经典视图',
    
    // Document info
    'document_info': '文档信息',
    'file_details': '文件详情',
    'file_name': '文件名',
    'pages': '页数',
    'processing_details': '处理详情',
    'processed_on': '处理时间',
    'at': '于',
    'word_count': '字数',
    'words': '词',
    'confidence': '置信度',
    'processing_duration': '处理时间',
    'seconds': '秒',
    'engine_details': '引擎详情',
    'model': '模型',
    'provider': '提供商',
    'translation_information': '翻译信息',
    'source_language': '源语言',
    'target_language': '目标语言',
    'translation_type': '翻译类型',
    'full_document': '完整文档',
    'partial': '部分内容',
    'auto_detected': '自动检测',
    'processing_note': '处理说明',
    'extraction_issues': '提取过程中遇到一些问题。请检查内容或尝试重新上传。',
    
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
    
    // History page
    'processing_history': '处理历史',
    'view_processed_documents': '查看您之前处理过的文档。',
    'recent_documents': '最近文档',
    'processing_history_30days': '您过去30天的处理历史。',
    'document': '文档',
    'date': '日期',
    'engine': '引擎',
    'status': '状态',
    'actions': '操作',
    'loading': '加载中...',
    'error_loading_history': '加载处理历史时出错',
    'no_history_found': '未找到处理历史',
    'unknown_date': '未知日期',
    'view': '查看',
    'download': '下载',
    'showing_page': '显示第 {0}',
    'loading_content': '加载内容',
    'retrieving_content': '正在获取文档内容...',
    'no_content_available': '没有可用内容',
    'no_extracted_content': '此记录没有任何提取的内容',
    'error_title': '错误',
    'failed_fetch_details': '获取记录详情失败',
    'download_started': '开始下载',
    'document_downloaded': '您的文档已作为 markdown 下载',
    'no_content_download': '此记录没有任何可下载的提取内容',
    'failed_download': '下载内容失败',
    'viewing_document': '查看文档: {0}',
    'document_processed_on': '文档处理时间: {0}',
    
    // Usage page
    'Credit Usage Overview': '额度使用概览',
    'Credit Usage History': '额度使用历史',
    'Your current tier': '您当前的套餐',
    'Credits used': '已使用额度',
    'Processing Costs': '处理成本',
    'Scanned Documents': '扫描文档',
    'Digital PDFs': '数字PDF',
    'credits per document': '额度/每文档',
    'Your Tier Benefits': '您的套餐权益',
    'Free Tier': '免费套餐',
    'Plus Tier': 'Plus套餐',
    'Pro Tier': 'Pro套餐',
    'No credit usage history yet': '暂无额度使用历史',
    'Process your first document to start tracking usage': '处理您的第一个文档以开始追踪使用情况',
    'Unable to load credit information': '无法加载额度信息',
    'Please try again later': '请稍后重试',
    'Date': '日期',
    'Description': '描述', 
    'Credits': '额度',
    
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
  const t = (key: string, param?: string): string => {
    const translation = translations[language]?.[key] || key;
    if (param) {
      return formatString(translation, param);
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