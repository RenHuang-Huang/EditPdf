import React, { useRef, useState } from 'react';
import { Page } from 'react-pdf';
import type { Annotation, EditorState } from '../types';
import { nanoid } from 'nanoid';
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
    onSelectAnnotation,
    onEditAnnotation
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [drawingId, setDrawingId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{ id: string, offsetX: number, offsetY: number } | null>(null);

    // Helper to get relative coordinates
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

        // Click-to-deselect: if 'select' tool is active and user clicks background, deselect
        if (toolStr.activeTool === 'select') {
            // Check if click target is the canvas itself (not an annotation element)
            const target = e.target as HTMLElement;
            if (target.classList.contains('pdf-page') || target.classList.contains('annotation-layer')) {
                onSelectAnnotation(''); // Deselect by passing empty ID
            }
            return;
        }

        if (toolStr.activeTool === 'text') {
            const text = prompt('請輸入文字:');
            if (text && text.trim()) {
                onAddAnnotation({
                    id: nanoid(),
                    type: 'text',
                    page: pageNumber,
                    x: coords.x,
                    y: coords.y,
                    text: text,
                    fontSize: toolStr.activeFontSize,
                    fontFamily: toolStr.activeFontFamily,
                    strokeColor: toolStr.activeStrokeColor,
                    strokeWidth: 1
                });
            }
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
        }
    };

    const handleAnnotationMouseDown = (e: React.MouseEvent, id: string, annX: number, annY: number) => {
        if (toolStr.activeTool !== 'select') return;

        e.stopPropagation();
        onSelectAnnotation(id);

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

            // Handle Rect/Text (Simple x/y update)
            if (current.type === 'text' || current.type === 'rect') {
                onUpdateAnnotation(dragState.id, {
                    x: x - dragState.offsetX,
                    y: y - dragState.offsetY
                });
            }

            // Handle Paths (Pen/Line) - Need to shift all points
            if ((current.type === 'pen' || current.type === 'line') && current.paths) {
                // For paths, we need to update all points relative to the new position
                // Calculate the delta from the original start point to the new mouse position
                const newX = x - dragState.offsetX;
                const newY = y - dragState.offsetY;

                // If this is the first move, calculate the initial offset for all points
                // Otherwise, calculate delta from previous mouse position
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

        if (!drawingId) return;

        if (toolStr.activeTool === 'pen') {
            const current = annotations.find(a => a.id === drawingId);
            if (current && current.paths) {
                onUpdateAnnotation(drawingId, {
                    paths: [...current.paths, { x, y }]
                });
            }
        }

        if (toolStr.activeTool === 'rect') {
            const current = annotations.find(a => a.id === drawingId);
            if (current) {
                onUpdateAnnotation(drawingId, {
                    width: x - current.x,
                    height: y - current.y
                });
            }
        }

        if (toolStr.activeTool === 'line') {
            const current = annotations.find(a => a.id === drawingId);
            if (current && current.paths) {
                let finalX = x;
                let finalY = y;

                if (e.shiftKey) {
                    const start = current.paths[0];
                    const dx = Math.abs(x - start.x);
                    const dy = Math.abs(y - start.y);
                    if (dx > dy) {
                        finalY = start.y;
                    } else {
                        finalX = start.x;
                    }
                }

                onUpdateAnnotation(drawingId, {
                    paths: [current.paths[0], { x: finalX, y: finalY }]
                });
            }
        }
    };

    const handleMouseUp = () => {
        if ((drawingId || dragState) && onAnnotationChangeEnd) {
            onAnnotationChangeEnd();
        }
        setDrawingId(null);
        setDragState(null);
    };

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
                                    pointerEvents: 'auto'
                                }}
                                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id, ann.x, ann.y)}
                            >
                                {ann.text}
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

                    if ((ann.type === 'pen' || ann.type === 'highlighter') && ann.paths) {
                        const pathData = ann.paths.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
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
