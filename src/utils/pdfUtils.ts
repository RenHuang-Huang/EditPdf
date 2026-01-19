import {
    PDFDocument,
    rgb,
    moveTo,
    lineTo,
    stroke,
    setStrokingColor,
    setLineWidth,
    pushGraphicsState,
    popGraphicsState,
    setGraphicsState,
    PDFName,
    PDFDict
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getFlattenedPoints } from './geometry';
import type { Annotation, TextOverlayAnnotation, ImageAnnotation } from '../types';

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
        // Try to load Chinese font if available
        let chineseFont = null;
        try {
            // Fix: Use BASE_URL to support GitHub Pages subpath
            const fontUrl = `${import.meta.env.BASE_URL}NotoSansTC-Regular.otf`;
            console.log('Fetching font from:', fontUrl);
            const notoSansResponse = await fetch(fontUrl);

            if (notoSansResponse.ok) {
                const notoSansFontBytes = await notoSansResponse.arrayBuffer();
                // Disable subsetting for now as it causes invisible text issues with CJK OTF fonts in pdf-lib
                // The file size will be larger, but it ensures text is rendered correctly.
                chineseFont = await pdfDoc.embedFont(notoSansFontBytes);
                console.log('Chinese font loaded successfully');
            } else {
                console.error('Failed to fetch Chinese font:', notoSansResponse.status, notoSansResponse.statusText);
            }
        } catch (e) {
            console.error('Error loading Chinese font:', e);
        }

        // Fallback or use for mixed content
        // const fallbackFont = chineseFont || helveticaFont; // Unused

        const pages = pdfDoc.getPages();

        for (const annotation of annotations) {
            const page = pages[annotation.page - 1];
            if (!page) continue;

            const { height: pageHeight } = page.getSize();

            // Handle text overlays (NEW!)
            if (annotation.type === 'image') {
                const imageAnn = annotation as ImageAnnotation;
                try {
                    const imageBytes = await imageAnn.file.arrayBuffer();
                    let image;
                    // Detect type strictly or try-catch both
                    // file.type should be reliable
                    if (imageAnn.file.type === 'image/jpeg' || imageAnn.file.type === 'image/jpg') {
                        image = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        // Fallback to PNG for everything else (or try embedPng)
                        // Note: pdf-lib only supports PNG/JPG. 
                        // If file is WebP, it might fail. Ideally convert, but for MVP just try.
                        image = await pdfDoc.embedPng(imageBytes);
                    }

                    page.drawImage(image, {
                        x: imageAnn.x,
                        y: pageHeight - imageAnn.y - imageAnn.height,
                        width: imageAnn.width,
                        height: imageAnn.height,
                        opacity: imageAnn.opacity || 1
                    });
                } catch (e) {
                    console.error('Failed to embed image:', e);
                }
                continue;
            }

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
                // Check for non-Latin characters to decide font
                // eslint-disable-next-line no-control-regex
                const hasNonLatin = /[^\u0000-\u007F]/.test(overlay.editedText);

                if (hasNonLatin && !chineseFont) {
                    throw new Error('中文字型載入失敗，無法匯出中文內容。請檢查網路或重新整理頁面。');
                }

                const font = (hasNonLatin && chineseFont) ? chineseFont : helveticaFont;

                page.drawText(overlay.editedText, {
                    x: overlay.x,
                    // Adjust for baseline
                    y: pageHeight - overlay.y - (overlay.fontSize * 0.75),
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
                // eslint-disable-next-line no-control-regex
                const hasNonLatin = /[^\u0000-\u007F]/.test(annotation.text);

                if (hasNonLatin && !chineseFont) {
                    throw new Error('中文字型載入失敗，無法匯出中文內容。請檢查網路或重新整理頁面。');
                }

                const font = (hasNonLatin && chineseFont) ? chineseFont : helveticaFont;

                page.drawText(annotation.text, {
                    x: annotation.x,
                    y: pageHeight - annotation.y - ((annotation.fontSize || 16) * 0.75),
                    size: annotation.fontSize || 16,
                    font: font,
                    color: rgb(
                        parseInt((annotation.strokeColor || '#000000').slice(1, 3), 16) / 255,
                        parseInt((annotation.strokeColor || '#000000').slice(3, 5), 16) / 255,
                        parseInt((annotation.strokeColor || '#000000').slice(5, 7), 16) / 255
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

                // Handle single point (Dot)
                if (annotation.paths.length === 1) {
                    const point = annotation.paths[0];
                    page.drawCircle({
                        x: point.x,
                        y: pageHeight - point.y,
                        size: (annotation.strokeWidth || 2) / 2,
                        color: strokeRgb,
                        opacity: annotation.opacity || 1,
                        borderWidth: 0
                    });
                    continue;
                }

                // 1. Flatten curve to many small segments (high fidelity)
                // 2. Join into ONE single SVG path "M ... L ... L ..." (No dots)
                // 3. Use L commands (robust, visible) instead of Q
                // 4. Strict "No Fill" (No spiderweb)

                // Cycle 15+16 Fix: Raw PDF Operators with Transparency
                // 1. "Nuclear" Path (moveTo/lineTo) -> Guarantees visibility/smoothness
                // 2. ExtGState -> Guarantees transparency

                const flatPoints = getFlattenedPoints(annotation.paths);
                if (flatPoints.length > 1) {
                    const ops = [];
                    ops.push(pushGraphicsState());

                    // Cycle 16: Handle Transparency manually
                    const opacity = annotation.opacity !== undefined ? annotation.opacity : 1;
                    if (opacity < 1) {
                        try {
                            const alphaName = `GS_Alpha_${Math.floor(opacity * 100)}`;
                            const pdfName = PDFName.of(alphaName);

                            // Check/Create Resources.ExtGState
                            let resources = page.node.Resources();
                            if (!resources) {
                                resources = pdfDoc.context.obj({});
                                page.node.set(PDFName.of('Resources'), resources);
                            }

                            let extGState = resources.get(PDFName.of('ExtGState'));
                            if (!extGState || !(extGState instanceof PDFDict)) {
                                extGState = pdfDoc.context.obj({});
                                resources.set(PDFName.of('ExtGState'), extGState);
                            }

                            if (extGState instanceof PDFDict) {
                                // Create logic only if not exists (optimization)
                                if (!extGState.has(pdfName)) {
                                    const dict = pdfDoc.context.obj({
                                        Type: 'ExtGState',
                                        CA: opacity, // Stroke Alpha
                                        ca: opacity  // Fill Alpha
                                    });
                                    extGState.set(pdfName, pdfDoc.context.register(dict));
                                }

                                // Apply State
                                ops.push(setGraphicsState(alphaName));
                            }
                        } catch (e) {
                            console.warn('Failed to set transparency for raw path:', e);
                        }
                    }

                    ops.push(setStrokingColor(strokeRgb));
                    ops.push(setLineWidth(annotation.strokeWidth || 2));

                    ops.push(moveTo(flatPoints[0].x, pageHeight - flatPoints[0].y));

                    for (let i = 1; i < flatPoints.length; i++) {
                        ops.push(lineTo(flatPoints[i].x, pageHeight - flatPoints[i].y));
                    }

                    ops.push(stroke());
                    ops.push(popGraphicsState());

                    page.pushOperators(...ops);
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
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const baseName = file.name.replace(/\.pdf$/i, '');
        link.download = `${baseName} _edit.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error saving PDF with overlays:', error);
        throw error;
    }
}

// Re-export old function name for compatibility
export const savePdf = savePdfWithOverlays;
