import React from 'react';
import type { Annotation } from '../types';
import { Type, Square, Pen, Minus, Highlighter, Trash2 } from 'lucide-react';
import './AnnotationsPanel.css';

interface AnnotationsPanelProps {
    annotations: Annotation[];
    numPages: number;
    onSelectAnnotation: (id: string, page: number) => void;
    onDeleteAnnotation: (id: string) => void;
    onEditAnnotation: (id: string) => void;
    onReorder: (draggedId: string, targetId: string) => void;
    selectedId: string | null;
}

export const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
    annotations,
    numPages,
    onSelectAnnotation,
    onDeleteAnnotation,
    onEditAnnotation,
    onReorder,
    selectedId
}) => {
    const getAnnotationIcon = (type: string) => {
        switch (type) {
            case 'text': return <Type size={16} />;
            case 'rect': return <Square size={16} />;
            case 'pen': return <Pen size={16} />;
            case 'line': return <Minus size={16} />;
            case 'highlighter': return <Highlighter size={16} />;
            default: return <Square size={16} />;
        }
    };

    const getAnnotationPreview = (ann: Annotation): string => {
        if (ann.type === 'text' && ann.text) {
            return ann.text.length > 20 ? ann.text.substring(0, 20) + '...' : ann.text;
        }
        if (ann.type === 'highlighter') {
            return '螢光筆';
        }
        if (ann.type === 'pen') {
            return '手繪';
        }
        if (ann.type === 'rect') {
            return '矩形';
        }
        if (ann.type === 'line') {
            return '直線';
        }
        return ann.type;
    };

    // Group annotations by page
    const annotationsByPage: Record<number, Annotation[]> = {};
    for (let i = 1; i <= numPages; i++) {
        annotationsByPage[i] = annotations.filter(a => a.page === i);
    }

    return (
        <div className="annotations-panel">
            <div className="panel-header">
                <h3>📊 註釋列表</h3>
                <span className="annotation-count">{annotations.length} 個物件</span>
            </div>

            <div className="panel-content">
                {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
                    const pageAnnotations = annotationsByPage[pageNum] || [];
                    if (pageAnnotations.length === 0) return null;

                    return (
                        <div key={pageNum} className="page-group">
                            <div className="page-header">
                                Page {pageNum} ({pageAnnotations.length})
                            </div>
                            <div className="annotation-list">
                                {[...pageAnnotations].reverse().map(ann => (
                                    <div
                                        key={ann.id}
                                        className={`annotation-item ${selectedId === ann.id ? 'selected' : ''}`}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', ann.id);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault(); // Allow drop
                                            e.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const draggedId = e.dataTransfer.getData('text/plain');
                                            if (draggedId !== ann.id) {
                                                onReorder(draggedId, ann.id);
                                            }
                                        }}
                                        onClick={() => onSelectAnnotation(ann.id, ann.page)}
                                        onDoubleClick={() => {
                                            if (ann.type === 'text') {
                                                onEditAnnotation(ann.id);
                                            }
                                        }}
                                    >
                                        <div className="annotation-icon" style={{ color: ann.strokeColor || '#000' }}>
                                            {getAnnotationIcon(ann.type)}
                                        </div>
                                        <div className="annotation-info">
                                            <span className="annotation-preview">{getAnnotationPreview(ann)}</span>
                                            <span className="annotation-type">{ann.type}</span>
                                        </div>
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteAnnotation(ann.id);
                                            }}
                                            title="刪除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {annotations.length === 0 && (
                    <div className="empty-state">
                        <p>尚無註釋</p>
                        <span>開始編輯 PDF 以新增註釋</span>
                    </div>
                )}
            </div>
        </div>
    );
};
