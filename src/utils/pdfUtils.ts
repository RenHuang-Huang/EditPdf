import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Annotation, TextOverlayAnnotation } from '../types';

/**
 * Enhanced PDF export with text overlay support
 * Includes white rectangle covering + new text drawing
 */
export async function savePdfWithOverlays(file: File, annotations: Annotation[]): Promise<void> {
    try {
        const existingPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        pdfDoc.registerFontkit(fontkit);

        // Load fonts
        const helveticaFont = await pdfDoc.embedFont('Helvetica');

        // Try to load Chinese font if available
        let chineseFont = helveticaFont;
        try {
            const notoSansResponse = await fetch('/NotoSansTC-Regular.ttf');
            if (notoSansResponse.ok) {
                const notoSansFontBytes = await notoSansResponse.arrayBuffer();
                chineseFont = await pdfDoc.embedFont(notoSansFontBytes);
            }
        } catch (e) {
            console.warn('Chinese font not available, using Helvetica');
        }

        const pages = pdfDoc.getPages();

        for (const annotation of annotations) {
            const page = pages[annotation.page - 1];
            if (!page) continue;

            const { height: pageHeight } = page.getSize();

            // Handle text overlays (NEW!)
            if (annotation.type === 'textOverlay') {
                const overlay = annotation as TextOverlayAnnotation;

                // 1. Draw white rectangle to cover original text
                page.drawRectangle({
                    x: overlay.coveredArea.x,
                    y: pageHeight - overlay.coveredArea.y - overlay.coveredArea.height,
                    width: overlay.coveredArea.width,
                    height: overlay.coveredArea.height,
                    color: rgb(1, 1, 1), // White
                    borderWidth: 0
                });

                // 2. Draw new text
                const font = overlay.fontFamily.includes('Noto') ? chineseFont : helveticaFont;
                page.drawText(overlay.editedText, {
                    x: overlay.x,
                    y: pageHeight - overlay.y,
                    size: overlay.fontSize,
                    font: font,
                    color: rgb(
                        parseInt(overlay.textColor.slice(1, 3), 16) / 255,
                        parseInt(overlay.textColor.slice(3, 5), 16) / 255,
                        parseInt(overlay.textColor.slice(5, 7), 16) / 255
                    )
                });
                continue;
            }

            // Original annotation handling (text, rect, pen, etc.)
            if (annotation.type === 'text' && annotation.text) {
                const font = annotation.fontFamily?.includes('Noto') ? chineseFont : helveticaFont;
                page.drawText(annotation.text, {
                    x: annotation.x,
                    y: pageHeight - annotation.y,
                    size: annotation.fontSize || 16,
                    font: font,
                    color: rgb(
                        parseInt(annotation.strokeColor.slice(1, 3), 16) / 255,
                        parseInt(annotation.strokeColor.slice(3, 5), 16) / 255,
                        parseInt(annotation.strokeColor.slice(5, 7), 16) / 255
                    )
                });
            }

            // Rectangles, pens, lines (existing code continues...)
            if (annotation.type === 'rect' && annotation.width && annotation.height) {
                const fillRgb = annotation.fillColor && annotation.fillColor !== 'transparent'
                    ? rgb(
                        parseInt(annotation.fillColor.slice(1, 3), 16) / 255,
                        parseInt(annotation.fillColor.slice(3, 5), 16) / 255,
                        parseInt(annotation.fillColor.slice(5, 7), 16) / 255
                    )
                    : undefined;

                const strokeRgb = rgb(
                    parseInt(annotation.strokeColor!.slice(1, 3), 16) / 255,
                    parseInt(annotation.strokeColor!.slice(3, 5), 16) / 255,
                    parseInt(annotation.strokeColor!.slice(5, 7), 16) / 255
                );

                page.drawRectangle({
                    x: annotation.x,
                    y: pageHeight - annotation.y - annotation.height,
                    width: annotation.width,
                    height: annotation.height,
                    borderColor: strokeRgb,
                    borderWidth: annotation.strokeWidth || 2,
                    color: fillRgb,
                    opacity: annotation.opacity || 1
                });
            }

            // Pen/Highlighter paths
            if ((annotation.type === 'pen' || annotation.type === 'highlighter') && annotation.paths && annotation.paths.length > 0) {
                const strokeRgb = rgb(
                    parseInt(annotation.strokeColor!.slice(1, 3), 16) / 255,
                    parseInt(annotation.strokeColor!.slice(3, 5), 16) / 255,
                    parseInt(annotation.strokeColor!.slice(5, 7), 16) / 255
                );

                for (let i = 0; i < annotation.paths.length - 1; i++) {
                    const p1 = annotation.paths[i];
                    const p2 = annotation.paths[i + 1];
                    page.drawLine({
                        start: { x: p1.x, y: pageHeight - p1.y },
                        end: { x: p2.x, y: pageHeight - p2.y },
                        thickness: annotation.strokeWidth || 2,
                        color: strokeRgb,
                        opacity: annotation.opacity || 1
                    });
                }
            }

            // Lines
            if (annotation.type === 'line' && 'x2' in annotation && 'y2' in annotation) {
                const strokeRgb = rgb(
                    parseInt(annotation.strokeColor!.slice(1, 3), 16) / 255,
                    parseInt(annotation.strokeColor!.slice(3, 5), 16) / 255,
                    parseInt(annotation.strokeColor!.slice(5, 7), 16) / 255
                );

                page.drawLine({
                    start: { x: annotation.x, y: pageHeight - annotation.y },
                    end: { x: annotation.x2!, y: pageHeight - annotation.y2! },
                    thickness: annotation.strokeWidth || 2,
                    color: strokeRgb,
                    opacity: annotation.opacity || 1
                });
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name.replace('.pdf', '_edited.pdf');
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error saving PDF with overlays:', error);
        throw error;
    }
}

// Re-export old function name for compatibility
export const savePdf = savePdfWithOverlays;
