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
  return file.type === 'application/pdf';
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
