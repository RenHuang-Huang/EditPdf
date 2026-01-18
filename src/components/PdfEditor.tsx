import React, { useState, useEffect, useRef } from 'react';
import { Document, pdfjs } from 'react-pdf';
import type { Annotation, EditorState, ToolType, FontFamily, TextAnnotation } from '../types';
import { PdfPage } from './PdfPage';
import { Toolbar } from './Toolbar';
import { LoadingOverlay } from './LoadingOverlay';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { AnnotationsPanel } from './AnnotationsPanel';
import { StatusBar } from './StatusBar';
import { PageNavigation } from './PageNavigation';
import { savePdf } from '../utils/pdfUtils';
import { exportToWord } from '../utils/wordExport';
import { performOCR, initOCR } from '../utils/ocrUtils';
import { nanoid } from 'nanoid';
import './PdfEditor.css';

// Use unpkg with matching version 5.4.296 (cdnjs doesn't have this version)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';

interface PdfEditorProps {
    file: File;
    onBack: () => void;
}

export const PdfEditor: React.FC<PdfEditorProps> = ({ file, onBack }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [state, setState] = useState<EditorState>({
        scale: 1.0,
        activeTool: 'select',
        selectedId: null,
        activeStrokeColor: '#ef4444',
        activeFillColor: 'transparent',
        activeStrokeWidth: 2,
        activeFontSize: 16,
        activeFontFamily: 'Helvetica',
        activeOpacity: 0.4,
    });
    const [rotation, setRotation] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const [activePage, setActivePage] = useState<number>(1);
    const clipboardRef = useRef<Annotation | null>(null);

    // History State
    const MAX_HISTORY = 50; // Limit history to prevent memory issues
    const [history, setHistory] = useState<Annotation[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // Helper to push state to history with limit
    const addToHistory = (newAnnotations: Annotation[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newAnnotations);

        // Limit history to MAX_HISTORY entries (keep most recent)
        const limitedHistory = newHistory.length > MAX_HISTORY
            ? newHistory.slice(newHistory.length - MAX_HISTORY)
            : newHistory;

        setHistory(limitedHistory);
        setHistoryIndex(limitedHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setAnnotations(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setAnnotations(history[historyIndex + 1]);
        }
    };

    const addAnnotation = (ann: Annotation) => {
        const newAnnotations = [...annotations, ann];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);

        if (ann.type === 'text') {
            setState(prev => ({ ...prev, selectedId: ann.id, activeTool: 'select' }));
        } else if (ann.type === 'rect' || ann.type === 'line') {
            // Keep drawing tool active for rect/line? Or switch?
            // Usually for rect/line we might want to draw multiple. 
            // But let's select it to resize? 
            // User prompt: "Rectangle... allowing drag-resizing" -> So better to auto-select.
            setState(prev => ({ ...prev, selectedId: ann.id }));
        }
        // For Highlighter/Pen, keep drawing.
    };

    const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
        const newAnnotations = annotations.map(ann =>
            ann.id === id ? { ...ann, ...updates } as Annotation : ann
        );
        setAnnotations(newAnnotations);
    };

    // Commit changes to history (called on MouseUp from PdfPage)
    const onAnnotationChangeEnd = () => {
        addToHistory(annotations);
    };

    const deleteAnnotation = (id: string) => {
        const newAnnotations = annotations.filter(a => a.id !== id);
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        if (state.selectedId === id) {
            setState(prev => ({ ...prev, selectedId: null }));
        }
    };

    const editAnnotation = (id: string) => {
        const ann = annotations.find(a => a.id === id);
        if (!ann || ann.type !== 'text') return;

        const newText = prompt('編輯文字內容:', ann.text || '');
        if (newText === null) return; // Cancelled

        const newFontSize = prompt('編輯字體大小 (pt):', String(ann.fontSize || 16));
        const fontSize = newFontSize ? Number(newFontSize) : ann.fontSize || 16;

        const newColor = prompt('編輯顏色 (hex, 如 #ff0000):', ann.strokeColor || '#000000');
        const strokeColor = newColor || ann.strokeColor || '#000000';

        const newAnnotations = annotations.map(a =>
            a.id === id
                ? { ...a, text: newText, fontSize, strokeColor }
                : a
        );
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
    };

    const handlePageFocus = (pageNum: number) => {
        setActivePage(pageNum);
    };

    const clearAllAnnotations = () => {
        const count = annotations.length;
        if (count === 0) {
            alert('目前沒有註釋');
            return;
        }

        const confirmed = window.confirm(`確定要清除所有 ${count} 個註釋嗎？此操作無法復原。`);
        if (confirmed) {
            setAnnotations([]);
            addToHistory([]);
            setState(prev => ({ ...prev, selectedId: null }));
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            // Help modal (?)
            if (e.key === '?' && !isCtrlOrCmd) {
                e.preventDefault();
                setShowHelp(true);
                return;
            }

            // ESC - Close help or deselect
            if (e.key === 'Escape') {
                if (showHelp) {
                    setShowHelp(false);
                } else if (state.selectedId) {
                    setState(prev => ({ ...prev, selectedId: null }));
                }
                return;
            }

            // Tool switching shortcuts
            if (e.key === 's' || e.key === 'S') setState(s => ({ ...s, activeTool: 'select' }));
            if (e.key === 't' || e.key === 'T') setState(s => ({ ...s, activeTool: 'text' }));
            if (e.key === 'p' || e.key === 'P') setState(s => ({ ...s, activeTool: 'pen' }));
            if (e.key === 'r' || e.key === 'R') setState(s => ({ ...s, activeTool: 'rect' }));
            if (e.key === 'l' || e.key === 'L') setState(s => ({ ...s, activeTool: 'line' }));
            if (e.key === 'h' || e.key === 'H') setState(s => ({ ...s, activeTool: 'highlighter' }));
            if (e.key === 'e' || e.key === 'E') setState(s => ({ ...s, activeTool: 'eraser' }));

            // Page navigation shortcuts
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setActivePage(p => Math.max(1, p - 1));
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setActivePage(p => Math.min(numPages, p + 1));
            }
            // Tool switching shortcuts (only if not typing in input)
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            if (!isTyping && !isCtrlOrCmd && !showHelp) {
                const toolMap: Record<string, ToolType> = {
                    's': 'select',
                    't': 'text',
                    'p': 'pen',
                    'r': 'rect',
                    'l': 'line',
                    'h': 'highlighter',
                    'e': 'eraser'
                };

                const key = e.key.toLowerCase();
                if (toolMap[key]) {
                    e.preventDefault();
                    setState(prev => ({ ...prev, activeTool: toolMap[key] }));
                    return;
                }
            }

            // Undo (Ctrl+Z)
            if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo (Ctrl+Y or Ctrl+Shift+Z)
            if (isCtrlOrCmd && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                redo();
            }

            // Select All (Ctrl+A)
            if (isCtrlOrCmd && e.key === 'a') {
                e.preventDefault();
                // Select all annotations on current page
                const pageAnnotations = annotations.filter(a => a.page === activePage);
                if (pageAnnotations.length > 0) {
                    // For now, just select the first one (full multi-select requires more work)
                    setState(prev => ({ ...prev, selectedId: pageAnnotations[0].id, activeTool: 'select' }));
                }
            }

            // Clear All (Ctrl+Shift+Delete)
            if (isCtrlOrCmd && e.shiftKey && e.key === 'Delete') {
                e.preventDefault();
                clearAllAnnotations();
            }

            // Delete
            if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
                // Prevent deleting if user is typing in a text input (though we don't have standard inputs focused usually)
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    deleteAnnotation(state.selectedId);
                }
            }

            // Copy
            if (isCtrlOrCmd && e.key === 'c' && state.selectedId) {
                const ann = annotations.find(a => a.id === state.selectedId);
                if (ann) {
                    clipboardRef.current = { ...ann };
                    e.preventDefault(); // Prevent browser copy
                }
            }

            // Paste
            if (isCtrlOrCmd && e.key === 'v' && clipboardRef.current) {
                const pastedAnn = {
                    ...clipboardRef.current,
                    id: nanoid(),
                    page: activePage, // Paste onto the currently focused/hovered page
                    // If pasting on same page, maybe shift it slightly? User asked for "same position" specifically for cross-page.
                    // But requirement says "Cross-page... SAME position". 
                    // Let's stick to exact coordinates. 
                    x: clipboardRef.current.x,
                    y: clipboardRef.current.y
                };

                // If on same page, shift slightly to indicate it's a copy?
                if (pastedAnn.page === clipboardRef.current.page) {
                    pastedAnn.x += 10;
                    pastedAnn.y += 10;
                    // Also shift paths if it's a pen/highlighter
                    if ((pastedAnn.type === 'pen' || pastedAnn.type === 'highlighter') && pastedAnn.paths) {
                        pastedAnn.paths = pastedAnn.paths.map((p: { x: number; y: number }) => ({ x: p.x + 10, y: p.y + 10 }));
                    }
                }

                addAnnotation(pastedAnn);
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedId, annotations, activePage, showHelp]); // Depend on activePage to know where to paste

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await savePdf(file, annotations);
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert(`匯出 PDF 失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportWord = async () => {
        setIsExporting(true);
        try {
            const filename = file.name.replace(/\.pdf$/i, '.docx');
            await exportToWord(annotations, filename);
        } catch (error) {
            console.error('Failed to export Word:', error);
            alert(`匯出 Word 失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleOCR = async () => {
        setIsExporting(true); // Reuse loading overlay
        try {
            // Get the canvas element for current page
            const canvas = document.querySelector('.react-pdf__Page canvas') as HTMLCanvasElement;
            if (!canvas) {
                throw new Error('找不到 PDF 頁面');
            }

            // Initialize and perform OCR
            await initOCR((progress) => {
                console.log(`OCR 進度: ${Math.round(progress * 100)}%`);
            });

            const text = await performOCR(canvas, (progress) => {
                console.log(`辨識進度: ${Math.round(progress * 100)}%`);
            });

            // Create text annotation from OCR result
            if (text.trim()) {
                const newAnnotation: TextAnnotation = {
                    id: nanoid(),
                    type: 'text',
                    page: activePage,
                    x: 50,
                    y: 50,
                    text: `OCR 結果:\n${text.trim()}`,
                    fontSize: 12,
                    fontFamily: 'Noto Sans TC',
                    strokeColor: '#000000',
                    strokeWidth: 1
                };
                addAnnotation(newAnnotation);
                alert(`OCR 完成！辨識到 ${text.length} 個字元`);
            } else {
                alert('OCR 未辨識到文字');
            }
        } catch (error) {
            console.error('OCR failed:', error);
            alert(`OCR 失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="pdf-editor">
            <Toolbar
                state={state}
                onStateChange={setState}
                onExport={handleExport}
                onExportWord={handleExportWord}
                onOCR={handleOCR}
                onZoomIn={() => setState(s => ({ ...s, scale: s.scale + 0.1 }))}
                onZoomOut={() => setState(s => ({ ...s, scale: Math.max(0.1, s.scale - 0.1) }))}
            />

            <PageNavigation
                currentPage={activePage}
                totalPages={numPages}
                rotation={rotation}
                onPageChange={setActivePage}
                onRotate={(dir) => setRotation(r => dir === 'cw' ? (r + 90) % 360 : (r - 90 + 360) % 360)}
                onSearch={setSearchQuery}
                searchQuery={searchQuery}
            />

            <div className="pdf-viewport">
                <div className="pdf-document">
                    <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="pdf-document-container"
                    >
                        {Array.from(new Array(numPages), (_, index) => (
                            <div key={'page_' + (index + 1)} onMouseDown={() => handlePageFocus(index + 1)}>
                                <PdfPage
                                    pageNumber={index + 1}
                                    scale={state.scale}
                                    annotations={annotations.filter(a => a.page === index + 1)}
                                    toolStr={state}
                                    onAddAnnotation={addAnnotation}
                                    onUpdateAnnotation={updateAnnotation}
                                    onAnnotationChangeEnd={onAnnotationChangeEnd}
                                    onSelectAnnotation={(id) => setState(prev => ({ ...prev, selectedId: id }))}
                                    onEditAnnotation={editAnnotation}
                                />
                            </div>
                        ))}
                    </Document>
                </div>
            </div>

            <AnnotationsPanel
                annotations={annotations}
                numPages={numPages}
                selectedId={state.selectedId}
                onSelectAnnotation={(id, page) => {
                    setState(prev => ({ ...prev, selectedId: id, activeTool: 'select' }));
                    setActivePage(page);
                }}
                onDeleteAnnotation={deleteAnnotation}
                onEditAnnotation={editAnnotation}
            />

            <StatusBar
                activeTool={state.activeTool}
                annotationCount={annotations.length}
                currentPage={activePage}
                totalPages={numPages}
                scale={state.scale}
            />

            {isExporting && <LoadingOverlay message="正在匯出 PDF..." />}
            {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
        </div>
    );
};
