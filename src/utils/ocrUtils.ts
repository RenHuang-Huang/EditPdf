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
        worker = await createWorker({
            logger: (m) => {
                if (onProgress && m.status === 'recognizing text') {
                    onProgress(m.progress);
                }
            }
        });

        // Load Chinese Traditional + English
        await worker.loadLanguage('chi_tra+eng');
        await worker.initialize('chi_tra+eng');

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
