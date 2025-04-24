declare module './table-parser' {
    function parseTablesFromText(content: string, fileName: string): Array<{
        type: "text" | "heading" | "code" | "table";
        content?: string;
        translatedContent?: string;
        language?: string;
        headers?: string[];
        translatedHeaders?: string[];
        rows?: string[][];
        translatedRows?: string[][];
    }>;
}