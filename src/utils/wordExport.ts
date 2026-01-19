import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import type { Annotation } from '../types';

/**
 * Exports PDF with text overlays to Word document
 * Note: This is a simplified version that extracts text content only
 * Layout and formatting may not be preserved accurately
 */
export async function exportToWord(annotations: Annotation[], filename: string): Promise<void> {
    try {
        // Group annotations by page
        const pageMap = new Map<number, Annotation[]>();
        annotations.forEach(ann => {
            if (!pageMap.has(ann.page)) {
                pageMap.set(ann.page, []);
            }
            pageMap.get(ann.page)!.push(ann);
        });

        // Sort annotations by position (top to bottom, left to right)
        const sortAnnotations = (anns: Annotation[]) => {
            return anns.sort((a, b) => {
                const yDiff = a.y - b.y;
                if (Math.abs(yDiff) > 20) return yDiff; // Different lines
                return a.x - b.x; // Same line, sort by x
            });
        };

        // Extract text from annotations
        const paragraphs: Paragraph[] = [];
        const pages = Array.from(pageMap.keys()).sort((a, b) => a - b);

        pages.forEach(pageNum => {
            const pageAnns = sortAnnotations(pageMap.get(pageNum)!);

            // Add page heading
            paragraphs.push(new Paragraph({
                children: [new TextRun({
                    text: `Page ${pageNum}`,
                    bold: true,
                    size: 32
                })]
            }));

            pageAnns.forEach(ann => {
                let text = '';
                let fontSize = 12;

                if (ann.type === 'text') {
                    text = ann.text || '';
                    if (ann.fontSize) fontSize = ann.fontSize;
                } else if (ann.type === 'textOverlay') {
                    text = ann.editedText || ann.originalText || '';
                    if (ann.fontSize) fontSize = ann.fontSize;
                }

                if (text) {
                    paragraphs.push(new Paragraph({
                        children: [new TextRun({
                            text,
                            size: fontSize * 2 // Word uses half-points
                        })]
                    }));
                }
            });

            // Add spacing between pages
            paragraphs.push(new Paragraph({ text: '' }));
        });

        // Create document
        const doc = new Document({
            sections: [{
                children: paragraphs
            }]
        });

        // Generate and save
        const blob = await Packer.toBlob(doc);
        saveAs(blob, filename);
    } catch (error) {
        console.error('Error exporting to Word:', error);
        throw new Error('匯出 Word 失敗: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
