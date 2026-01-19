import React, { useRef, useState, useEffect } from 'react';
import { Page } from 'react-pdf';
import type { Annotation, EditorState, ImageAnnotation } from '../types';
import { nanoid } from 'nanoid';
import { getSmoothedPath } from '../utils/geometry';
import './PdfPage.css';

interface PdfPageProps {
    pageNumber: number;
    scale: number;
    annotations: Annotation[];
    toolStr: EditorState;
    onAddAnnotation: (annotation: Annotation) => void;
    onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
    onAnnotationChangeEnd?: () => void;
    onSelectAnnotation: (id: string) => void;
    onEditAnnotation?: (id: string) => void;
}

export const PdfPage: React.FC<PdfPageProps> = ({
    pageNumber,
    scale,
    annotations,
    toolStr,
    onAddAnnotation,
    onUpdateAnnotation,
    onAnnotationChangeEnd,
    onSelectAnnotation
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [drawingId, setDrawingId] = useState<string | null>(null);
    const drawingIdRef = useRef<string | null>(null);
    const [dragState, setDragState] = useState<{ id: string, offsetX: number, offsetY: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null); // New: Track which text is being edited

    useEffect(() => {
        drawingIdRef.current = drawingId;
    }, [drawingId]);

    const getRelativeCoords = (e: React.MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const coords = getRelativeCoords(e);
        if (!coords) return;

        // If editing text, clicking outside should finish editing
        if (editingId) {
            setEditingId(null);
            return;
        }

        if (toolStr.activeTool === 'select') {
            onSelectAnnotation('');
            return;
        }

        if (toolStr.activeTool === 'text') {
            const newId = nanoid();
            onAddAnnotation({
                id: newId,
                type: 'text',
                page: pageNumber,
                x: coords.x,
                y: coords.y,
                text: '輸入文字',  // Placeholder
                fontSize: toolStr.activeFontSize,
                fontFamily: toolStr.activeFontFamily,
                strokeColor: toolStr.activeStrokeColor,
                strokeWidth: 1
            });
            // Enter edit mode immediately
            setEditingId(newId);
            // Also select it to allow dragging
            onSelectAnnotation(newId);
            return;
        }

        if (toolStr.activeTool === 'rect') {
            const newId = nanoid();
            onAddAnnotation({
                id: newId,
                type: 'rect',
                page: pageNumber,
                x: coords.x,
                y: coords.y,
                width: 1,
                height: 1,
                strokeColor: toolStr.activeStrokeColor,
                strokeWidth: toolStr.activeStrokeWidth,
                fillColor: toolStr.activeFillColor || 'transparent',
                opacity: toolStr.activeOpacity
            });
            setDrawingId(newId);
            drawingIdRef.current = newId;
            return;
        }

        if (toolStr.activeTool === 'pen' || toolStr.activeTool === 'highlighter') {
            const newId = nanoid();
            onAddAnnotation({
                id: newId,
                type: toolStr.activeTool,
                page: pageNumber,
                x: coords.x,
                y: coords.y,
                paths: [{ x: coords.x, y: coords.y }],
                strokeColor: toolStr.activeStrokeColor,
                strokeWidth: toolStr.activeStrokeWidth,
                opacity: toolStr.activeOpacity
            });
            setDrawingId(newId);
            drawingIdRef.current = newId;
            return;
        }

        if (toolStr.activeTool === 'line') {
            const newId = nanoid();
            onAddAnnotation({
                id: newId,
                type: 'line',
                page: pageNumber,
                x: coords.x,
                y: coords.y,
                x2: coords.x,
                y2: coords.y,
                strokeColor: toolStr.activeStrokeColor,
                strokeWidth: toolStr.activeStrokeWidth
            });
            setDrawingId(newId);
            drawingIdRef.current = newId;
        }
    };

    const handleAnnotationMouseDown = (e: React.MouseEvent, id: string, annX: number, annY: number) => {
        if (toolStr.activeTool !== 'select') return;

        e.stopPropagation();
        onSelectAnnotation(id);

        // Double click logic could be handled here, but standard click is fine for now.
        // Double click logic is now handled by explicit onDoubleClick handlers on elements
        // if (e.detail === 2) { ... }

        const { x, y } = getRelativeCoords(e);
        setDragState({
            id,
            offsetX: x - annX,
            offsetY: y - annY
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const { x, y } = getRelativeCoords(e);

        if (dragState) {
            const current = annotations.find(a => a.id === dragState.id);
            if (!current) return;

            if (current.type === 'text' || current.type === 'rect' || current.type === 'image') {
                onUpdateAnnotation(dragState.id, {
                    x: x - dragState.offsetX,
                    y: y - dragState.offsetY
                });
            }

            if (current.type === 'line') {
                const newX = x - dragState.offsetX;
                const newY = y - dragState.offsetY;
                const deltaX = newX - current.x;
                const deltaY = newY - current.y;

                onUpdateAnnotation(dragState.id, {
                    x: newX,
                    y: newY,
                    x2: (current.x2 || 0) + deltaX,
                    y2: (current.y2 || 0) + deltaY
                });
                return;
            }

            if ((current.type === 'pen' || current.type === 'highlighter') && current.paths) {
                const newX = x - dragState.offsetX;
                const newY = y - dragState.offsetY;
                const originalFirstPoint = current.paths[0];
                const deltaX = newX - originalFirstPoint.x;
                const deltaY = newY - originalFirstPoint.y;

                onUpdateAnnotation(dragState.id, {
                    paths: current.paths.map(p => ({
                        x: p.x + deltaX,
                        y: p.y + deltaY
                    }))
                });
            }
            return;
        }

        const currentDrawingId = drawingIdRef.current;
        if (!currentDrawingId) return;

        if (toolStr.activeTool === 'pen' || toolStr.activeTool === 'highlighter') {
            const current = annotations.find(a => a.id === currentDrawingId);
            if (current && (current.type === 'pen' || current.type === 'highlighter') && current.paths) {
                onUpdateAnnotation(currentDrawingId, {
                    paths: [...current.paths, { x, y }]
                });
            }
        }

        if (toolStr.activeTool === 'rect') {
            const current = annotations.find(a => a.id === currentDrawingId);
            if (current && current.type === 'rect') {
                onUpdateAnnotation(currentDrawingId, {
                    width: x - current.x,
                    height: y - current.y
                });
            }
        }

        if (toolStr.activeTool === 'line') {
            const current = annotations.find(a => a.id === currentDrawingId);
            if (current && current.type === 'line') {
                let finalX = x;
                let finalY = y;

                if (e.shiftKey) {
                    const startX = current.x;
                    const startY = current.y;
                    const dx = x - startX;
                    const dy = y - startY;
                    const angle = Math.atan2(dy, dx);
                    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    finalX = startX + Math.cos(snapAngle) * dist;
                    finalY = startY + Math.sin(snapAngle) * dist;
                }

                onUpdateAnnotation(currentDrawingId, {
                    x2: finalX,
                    y2: finalY
                });
            }
        }
    };

    const handleMouseUp = () => {
        if ((drawingId || dragState) && onAnnotationChangeEnd) {
            onAnnotationChangeEnd();
        }
        setDrawingId(null);
        drawingIdRef.current = null;
        setDragState(null);
    };

    const ImageNode = React.memo(({ ann, isSelected, onMouseDown }: { ann: ImageAnnotation, isSelected: boolean, onMouseDown: (e: React.MouseEvent) => void }) => {
        const [src, setSrc] = useState<string | null>(null);

        useEffect(() => {
            if (!ann.file) return;
            const objectUrl = URL.createObjectURL(ann.file);
            setSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }, [ann.file]);

        if (!src) return null;

        const styleBase = {
            position: 'absolute' as const,
            cursor: toolStr.activeTool === 'select' ? 'move' : 'pointer',
            boxShadow: isSelected ? '0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'
        };

        return (
            <div
                className={`annotation image ${isSelected ? 'selected' : ''}`}
                style={{
                    ...styleBase,
                    left: ann.x,
                    top: ann.y,
                    width: ann.width,
                    height: ann.height,
                    pointerEvents: 'auto'
                }}
                onMouseDown={onMouseDown}
            >
                <img
                    src={src}
                    alt="annotation"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: ann.opacity || 1,
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                />
            </div>
        );
    });

    return (
        <div
            className={`pdf-page tool-${toolStr.activeTool}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            ref={containerRef}
        >
            <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
            />
            <div className="annotation-layer" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                onMouseDown={handleMouseDown}
            >
                {annotations.map(ann => {
                    const isSelected = toolStr.selectedId === ann.id;
                    const styleBase = {
                        position: 'absolute' as const,
                        cursor: toolStr.activeTool === 'select' ? 'move' : 'pointer',
                        boxShadow: isSelected ? '0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'
                    };

                    if (ann.type === 'text') {
                        const isEditing = editingId === ann.id;
                        return (
                            <div
                                key={ann.id}
                                className={`annotation text ${isSelected ? 'selected' : ''}`}
                                style={{
                                    ...styleBase,
                                    left: ann.x,
                                    top: ann.y,
                                    color: ann.strokeColor,
                                    fontSize: `${ann.fontSize || 16}px`,
                                    fontFamily: ann.fontFamily || 'Helvetica',
                                    whiteSpace: 'nowrap',
                                    userSelect: 'none',
                                    pointerEvents: 'auto',
                                    minWidth: '20px',
                                    minHeight: '20px',
                                    zIndex: isEditing ? 1000 : undefined // Bring to front when editing
                                }}
                                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id, ann.x, ann.y)}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(ann.id);
                                }}
                            >
                                {isEditing ? (
                                    <textarea
                                        autoFocus
                                        defaultValue={ann.text}
                                        placeholder="輸入文字..."
                                        style={{
                                            font: 'inherit',
                                            color: 'inherit',
                                            background: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white bg for visibility
                                            border: '1px solid #2563eb', // Blue border to indicate focus
                                            borderRadius: '4px',
                                            outline: 'none',
                                            resize: 'both',
                                            overflow: 'hidden',
                                            minWidth: '100px',
                                            minHeight: '1.2em',
                                            whiteSpace: 'pre-wrap', // Allow wrapping
                                            padding: '4px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                        onBlur={(e) => {
                                            onUpdateAnnotation(ann.id, { text: e.target.value });
                                            setEditingId(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        ref={(el) => {
                                            // Ensure focus
                                            if (el) {
                                                el.focus();
                                                // Move cursor to end
                                                el.setSelectionRange(el.value.length, el.value.length);
                                            }
                                        }}
                                    />
                                ) : (
                                    ann.text
                                )}
                            </div>
                        );
                    }

                    if (ann.type === 'rect') {
                        return (
                            <div
                                key={ann.id}
                                className={`annotation rect ${isSelected ? 'selected' : ''}`}
                                style={{
                                    ...styleBase,
                                    left: ann.x,
                                    top: ann.y,
                                    width: ann.width,
                                    height: ann.height,
                                    border: `${ann.strokeWidth}px solid ${ann.strokeColor}`,
                                    backgroundColor: ann.fillColor || 'transparent',
                                    opacity: ann.opacity || 1,
                                    pointerEvents: 'auto'
                                }}
                                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id, ann.x, ann.y)}
                            />
                        );
                    }

                    if (ann.type === 'image') {
                        return (
                            <ImageNode
                                key={ann.id}
                                ann={ann}
                                isSelected={isSelected}
                                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id, ann.x, ann.y)}
                            />
                        );
                    }

                    if ((ann.type === 'pen' || ann.type === 'highlighter') && ann.paths) {
                        const pathData = getSmoothedPath(ann.paths);
                        return (
                            <svg key={ann.id} className={`annotation path-container ${isSelected ? 'selected' : ''}`} style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                <path
                                    d={pathData}
                                    stroke={ann.strokeColor}
                                    strokeWidth={ann.strokeWidth || 2}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity={ann.opacity || 0.4}
                                    className="annotation-path"
                                    style={{ pointerEvents: 'stroke', cursor: toolStr.activeTool === 'select' ? 'move' : 'pointer' }}
                                    onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id, ann.paths![0].x, ann.paths![0].y)}
                                />
                            </svg>
                        );
                    }

                    if (ann.type === 'line' && ann.x2 !== undefined && ann.y2 !== undefined) {
                        return (
                            <svg key={ann.id} className={`annotation line-container ${isSelected ? 'selected' : ''}`} style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                <line
                                    x1={ann.x}
                                    y1={ann.y}
                                    x2={ann.x2}
                                    y2={ann.y2}
                                    stroke={ann.strokeColor}
                                    strokeWidth={ann.strokeWidth || 2}
                                    strokeLinecap="round"
                                    className="annotation-line"
                                    style={{ pointerEvents: 'stroke', cursor: toolStr.activeTool === 'select' ? 'move' : 'pointer' }}
                                    onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id, ann.x, ann.y)}
                                />
                            </svg>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
};
