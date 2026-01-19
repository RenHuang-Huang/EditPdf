import Tesseract, { createWorker } from 'tesseract.js';

/**
 * OCR utility for recognizing text from images or PDF pages
 * Supports multiple languages including Chinese and English
 */

let worker: Tesseract.Worker | null = null;

/**
 * Initialize Tesseract worker (call once)
 */
export async function initOCR(onProgress?: (progress: number) => void): Promise<void> {
    if (worker) return; // Already initialized

    try {
        // Tesseract.js v6+ API: createWorker(langs, oem, options)
        worker = await createWorker('chi_tra+eng', 1, {
            logger: (m: any) => {
                console.log('[Tesseract]', m.status, m.progress);
                if (onProgress) {
                    // Normalize progress based on status
                    if (m.status === 'loading tesseract core') {
                        onProgress(0.1 + (m.progress || 0) * 0.1);
                    } else if (m.status === 'loading language traineddata') {
                        onProgress(0.2 + (m.progress || 0) * 0.2);
                    } else if (m.status === 'initializing api') {
                        onProgress(0.5);
                    } else if (m.status === 'recognizing text') {
                        onProgress(0.5 + (m.progress || 0) * 0.5);
                    } else {
                        onProgress(0.1); // generic activity
                    }
                }
            }
        });

        console.log('OCR initialized successfully');
    } catch (error) {
        console.error('OCR initialization failed:', error);
        throw new Error('OCR 初始化失敗: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

/**
 * Perform OCR on a canvas element (PDF page)
 */
export async function performOCR(
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number) => void
): Promise<string> {
    if (!worker) {
        await initOCR(onProgress);
    }

    try {
        const { data: { text } } = await worker!.recognize(canvas);
        return text;
    } catch (error) {
        console.error('OCR recognition failed:', error);
        throw new Error('OCR 辨識失敗: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

/**
 * Perform OCR on current PDF page and return structured results
 */
export async function ocrPdfPage(
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number) => void
): Promise<Tesseract.Page> {
    if (!worker) {
        await initOCR(onProgress);
    }

    try {
        const result = await worker!.recognize(canvas);
        return result.data;
    } catch (error) {
        console.error('OCR page recognition failed:', error);
        throw new Error('OCR 頁面辨識失敗: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

/**
 * Cleanup OCR worker when no longer needed
 */
export async function terminateOCR(): Promise<void> {
    if (worker) {
        await worker.terminate();
        worker = null;
        console.log('OCR worker terminated');
    }
}
