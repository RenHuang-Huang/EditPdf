import React, { useState, useEffect, useRef } from 'react';
import { Document, pdfjs } from 'react-pdf';
import type { Annotation, EditorState, ToolType, FontFamily } from '../types';
import { PdfPage } from './PdfPage';
import { Toolbar } from './Toolbar';
import { LoadingOverlay } from './LoadingOverlay';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { AnnotationsPanel } from './AnnotationsPanel';
import { StatusBar } from './StatusBar';

import { savePdf } from '../utils/pdfUtils';
import { nanoid } from 'nanoid';
import './PdfEditor.css';

// Use unpkg with matching version 5.4.296 (cdnjs doesn't have this version)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';

interface PdfEditorProps {
    file: File;
    onBack: () => void;
}

export const PdfEditor: React.FC<PdfEditorProps> = ({ file }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('處理中...'); // New state
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

    const reorderAnnotations = (draggedId: string, targetId: string) => {
        const fromIndex = annotations.findIndex(a => a.id === draggedId);
        const toIndex = annotations.findIndex(a => a.id === targetId);

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

        const newAnnotations = [...annotations];
        const [movedItem] = newAnnotations.splice(fromIndex, 1);
        newAnnotations.splice(toIndex, 0, movedItem);

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

    // Sync Selection -> Toolbar State
    useEffect(() => {
        if (!state.selectedId) return;

        const ann = annotations.find(a => a.id === state.selectedId);
        if (!ann) return;

        setState(prev => {
            // Only update if changed to avoid unnecessary re-renders
            const next = { ...prev };
            let changed = false;

            if (ann.strokeColor && ann.strokeColor !== prev.activeStrokeColor) {
                next.activeStrokeColor = ann.strokeColor;
                changed = true;
            }
            if (ann.strokeWidth && ann.strokeWidth !== prev.activeStrokeWidth) {
                next.activeStrokeWidth = ann.strokeWidth;
                changed = true;
            }
            if (ann.opacity !== undefined && ann.opacity !== prev.activeOpacity) {
                next.activeOpacity = ann.opacity;
                changed = true;
            }
            // Text properties
            if (ann.type === 'text') {
                if (ann.fontSize && ann.fontSize !== prev.activeFontSize) {
                    next.activeFontSize = ann.fontSize;
                    changed = true;
                }
                if (ann.fontFamily && ann.fontFamily !== prev.activeFontFamily) {
                    next.activeFontFamily = ann.fontFamily as FontFamily;
                    changed = true;
                }
            }
            // Fill Color (Rect/Pen)
            if (ann.fillColor && ann.fillColor !== prev.activeFillColor) {
                next.activeFillColor = ann.fillColor;
                changed = true;
            } else if (ann.type === 'rect' && !ann.fillColor && prev.activeFillColor !== 'transparent') {
                // If rect has no fill (undefined), treat as transparent?
                // Or just ignore if it's undefined.
                // Let's assume 'transparent' for undefined if previously set.
            }

            return changed ? next : prev;
        });
    }, [state.selectedId, annotations]); // Sync when selection changes or annotation updates (e.g. verify sync)

    // Keyboard Shortcuts
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
    }, [state.selectedId, annotations, activePage, showHelp]);

    // Better approach: Separate handler for internal set state, and side effect
    const setEditorState: React.Dispatch<React.SetStateAction<EditorState>> = (action) => {
        const next = typeof action === 'function' ? action(state) : action;

        if (next.selectedId) {
            const updates: any = {}; // Use any to bypass union type restrictions for specific props
            const prev = state; // Use current state as prev

            if (next.activeStrokeColor !== prev.activeStrokeColor) updates.strokeColor = next.activeStrokeColor;
            if (next.activeStrokeWidth !== prev.activeStrokeWidth) updates.strokeWidth = next.activeStrokeWidth;
            if (next.activeFillColor !== prev.activeFillColor) updates.fillColor = next.activeFillColor;
            if (next.activeOpacity !== prev.activeOpacity) updates.opacity = next.activeOpacity;

            // Text specific
            if (next.activeFontSize !== prev.activeFontSize) updates.fontSize = next.activeFontSize;
            if (next.activeFontFamily !== prev.activeFontFamily) updates.fontFamily = next.activeFontFamily;

            if (Object.keys(updates).length > 0) {
                updateAnnotation(next.selectedId!, updates);
            }
        }

        // Auto-deselect when switching to drawing tools
        if (next.activeTool !== state.activeTool && next.activeTool !== 'select') {
            next.selectedId = null;
        }

        setState(next);
    };

    // ... (rest of code)


    const handleExport = async () => {
        setIsExporting(true);
        setLoadingMessage('正在匯出 PDF...');
        try {
            await savePdf(file, annotations);
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert(`匯出 PDF 失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    // Drop Handler for Images
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(f => f.type.startsWith('image/'));

        if (imageFiles.length === 0) return;

        const file = imageFiles[0];
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            let w = img.width;
            let h = img.height;
            const maxSize = 200;

            if (w > h && w > maxSize) {
                h = (h * maxSize) / w;
                w = maxSize;
            } else if (h > maxSize) {
                w = (w * maxSize) / h;
                h = maxSize;
            }

            const newAnn: Annotation = {
                id: nanoid(),
                type: 'image',
                page: activePage,
                x: 100,
                y: 100,
                width: w,
                height: h,
                file: file,
                rotation: 0,
                opacity: 1
            };

            addAnnotation(newAnn);
            URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
    };

    return (
        <div
            className="pdf-editor"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <Toolbar
                state={state}
                onStateChange={setEditorState}
                onExport={handleExport}
                onZoomIn={() => setState(s => ({ ...s, scale: s.scale + 0.1 }))}
                onZoomOut={() => setState(s => ({ ...s, scale: Math.max(0.1, s.scale - 0.1) }))}
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
                onReorder={reorderAnnotations}
            />

            <StatusBar
                activeTool={state.activeTool}
                annotationCount={annotations.length}
                currentPage={activePage}
                totalPages={numPages}
                scale={state.scale}
            />

            {isExporting && <LoadingOverlay message={loadingMessage} />}
            {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
        </div>
    );
};
