import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FileData, ExtractedContent } from "@shared/schema";

// Combine class names with tailwind utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Check if file is PDF
export function isPdfFile(file: File): boolean {
  // More lenient check - either check MIME type or extension
  return file.type === 'application/pdf' || 
         file.name.toLowerCase().endsWith('.pdf');
}

// Read file as base64
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Get file data from File object
export async function getFileData(file: File): Promise<FileData> {
  const base64 = await readFileAsBase64(file);
  return {
    name: file.name,
    size: formatFileSize(file.size),
    lastModified: new Date(file.lastModified).toLocaleDateString(),
    type: file.type,
    base64,
  };
}

// Format extracted content for export as text
export function formatExtractedContentAsText(content: ExtractedContent): string {
  let result = `${content.title}\n\n`;
  
  content.content.forEach((item) => {
    if (item.type === 'text' || item.type === 'heading') {
      result += `${item.content}\n\n`;
    } else if (item.type === 'code') {
      result += `Code (${item.language || 'unknown'}):\n${item.content}\n\n`;
    } else if (item.type === 'table') {
      result += 'Table:\n';
      if (item.headers) {
        result += item.headers.join('\t') + '\n';
      }
      if (item.rows) {
        item.rows.forEach((row) => {
          result += row.join('\t') + '\n';
        });
      }
      result += '\n';
    }
  });
  
  result += `Metadata:\n`;
  result += `Pages: ${content.pages}\n`;
  result += `Extraction Time: ${content.metadata.extractionTime}\n`;
  result += `Word Count: ${content.metadata.wordCount}\n`;
  result += `Confidence: ${(content.metadata.confidence * 100).toFixed(1)}%\n`;
  
  return result;
}

// Export content as text file
export function exportAsText(content: ExtractedContent, filename: string) {
  const text = formatExtractedContentAsText(content);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\.pdf$/i, '')}_extracted.txt`;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Format extracted content as markdown
export function formatExtractedContentAsMarkdown(content: ExtractedContent): string {
  let markdown = `# ${content.title}\n\n`;
  
  // Add metadata section using proper markdown format
  markdown += `## Document Information\n\n`;
  markdown += `- **Pages:** ${content.pages}\n`;
  markdown += `- **Extraction Time:** ${content.metadata.extractionTime}\n`;
  markdown += `- **Word Count:** ${content.metadata.wordCount}\n`;
  markdown += `- **Confidence:** ${(content.metadata.confidence * 100).toFixed(1)}%\n`;
  
  if (content.metadata.isTranslated) {
    markdown += `- **Translated:** Yes\n`;
    if (content.metadata.targetLanguage) {
      markdown += `- **Target Language:** ${content.metadata.targetLanguage}\n`;
    }
  }
  
  markdown += '\n## Content\n\n';
  
  // Process each content item with proper markdown formatting
  for (const item of content.content) {
    switch (item.type) {
      case 'heading':
        // Use proper heading format based on content
        if (item.content?.includes("Pages")) {
          markdown += `### ${item.content}\n\n`;
        } else if (item.content?.startsWith("Extracted Content")) {
          markdown += `## ${item.content}\n\n`;
        } else {
          markdown += `### ${item.content}\n\n`;
        }
        
        if (item.translatedContent) {
          markdown += `*${item.translatedContent}*\n\n`;
        }
        break;
        
      case 'text':
        // Special case for page separator
        if (item.content === '---') {
          markdown += `---\n\n`;
        } else if (item.translatedContent) {
          markdown += `${item.content}\n\n`;
          markdown += `*Translation:*\n\n${item.translatedContent}\n\n`;
          markdown += `---\n\n`;
        } else {
          markdown += `${item.content}\n\n`;
        }
        break;
        
      case 'code':
        // Use proper code block format
        if (item.language) {
          markdown += `\`\`\`${item.language}\n`;
        } else {
          markdown += `\`\`\`\n`;
        }
        markdown += `${item.content}\n\`\`\`\n\n`;
        
        if (item.translatedContent) {
          markdown += `*Translation:*\n\n`;
          markdown += `${item.translatedContent}\n\n`;
          markdown += `---\n\n`;
        }
        break;
        
      case 'table':
        if (item.headers && item.rows) {
          // Generate proper markdown table
          markdown += '### Table\n\n';
          
          // Headers row with proper markdown table format
          markdown += '| ' + item.headers.join(' | ') + ' |\n';
          // Separator row
          markdown += '| ' + item.headers.map(() => '---').join(' | ') + ' |\n';
          
          // Data rows
          for (const row of item.rows) {
            // Escape pipe characters in cells to prevent breaking the table
            const escapedRow = row.map(cell => cell.replace(/\|/g, '\\|'));
            markdown += '| ' + escapedRow.join(' | ') + ' |\n';
          }
          
          markdown += '\n';
          
          // If we have translated table
          if (item.translatedHeaders && item.translatedRows) {
            markdown += '### Translated Table\n\n';
            
            // Headers row with proper markdown table format
            markdown += '| ' + item.translatedHeaders.join(' | ') + ' |\n';
            // Separator row
            markdown += '| ' + item.translatedHeaders.map(() => '---').join(' | ') + ' |\n';
            
            // Data rows
            for (const row of item.translatedRows) {
              // Escape pipe characters in cells to prevent breaking the table
              const escapedRow = row.map(cell => cell.replace(/\|/g, '\\|'));
              markdown += '| ' + escapedRow.join(' | ') + ' |\n';
            }
            
            markdown += '\n';
          }
        }
        break;
    }
  }
  
  return markdown;
}

// Export content as markdown file
export function exportAsMarkdown(content: ExtractedContent, filename: string) {
  const markdown = formatExtractedContentAsMarkdown(content);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\.pdf$/i, '')}_extracted.md`;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Export content as JSON file
export function exportAsJson(content: ExtractedContent, filename: string) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\.pdf$/i, '')}_extracted.json`;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date);
  }
}
