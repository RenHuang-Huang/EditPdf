import React from 'react';
import {
    MousePointer2, Type, PenTool, Square, Minus, Download, Slash, FileText, ScanText,
    Highlighter, Undo2, Redo2, ZoomIn, ZoomOut
} from 'lucide-react';
import type { EditorState, FontFamily } from '../types';
import './Toolbar.css';

interface ToolbarProps {
    state: EditorState;
    onStateChange: React.Dispatch<React.SetStateAction<EditorState>>;
    onExport: () => void;
    onExportWord: () => void;
    onOCR: () => void;  // NEW: OCR功能
    onZoomIn: () => void;
    onZoomOut: () => void;
}

// ... (imports are fine)

export const Toolbar: React.FC<ToolbarProps> = ({
    state,
    onStateChange,
    onExport,
    onExportWord,
    onOCR,
    onZoomIn,
    onZoomOut
}) => {
    // Define tools with their click handlers directly to avoid complex map logic if it causes issues,
    // or rewrite map logic cleanly. Let's use map but correct the container.

    const updateState = (updates: Partial<EditorState>) => {
        onStateChange(prev => ({ ...prev, ...updates }));
    };

    const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateState({ activeFontFamily: e.target.value as FontFamily });
    };

    return (
        <div className="toolbar-container">
            <div className="toolbar main-bar">
                {/* Tools */}
                <div className="tool-group">
                    <button className={`tool-btn ${state.activeTool === 'select' ? 'active' : ''}`} onClick={() => updateState({ activeTool: 'select' })} title="Select (S)">
                        <MousePointer2 size={18} />
                    </button>
                    <button className={`tool-btn ${state.activeTool === 'text' ? 'active' : ''}`} onClick={() => updateState({ activeTool: 'text' })} title="Text (T)">
                        <Type size={18} />
                    </button>
                    <button className={`tool-btn ${state.activeTool === 'rect' ? 'active' : ''}`} onClick={() => updateState({ activeTool: 'rect' })} title="Rectangle (R)">
                        <Square size={18} />
                    </button>
                    <button className={`tool-btn ${state.activeTool === 'line' ? 'active' : ''}`} onClick={() => updateState({ activeTool: 'line' })} title="Line (L)">
                        <Minus size={18} />
                    </button>
                    <button className={`tool-btn ${state.activeTool === 'pen' ? 'active' : ''}`} onClick={() => updateState({ activeTool: 'pen' })} title="Pen (P)">
                        <PenTool size={18} />
                    </button>
                    <button className={`tool-btn ${state.activeTool === 'highlighter' ? 'active' : ''}`} onClick={() => updateState({ activeTool: 'highlighter' })} title="Highlighter (H)">
                        <Highlighter size={18} />
                    </button>
                </div>

                <div className="separator" />

                {/* Undo/Redo */}
                <div className="tool-group">
                    <button className="tool-btn" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))} title="Undo (Ctrl+Z)">
                        <Undo2 size={18} />
                    </button>
                    <button className="tool-btn" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))} title="Redo (Ctrl+Y)">
                        <Redo2 size={18} />
                    </button>
                </div>

                <div className="separator" />

                {/* Properties */}
                <div className="properties-group">
                    <div className="property-item">
                        <div className="color-picker-wrapper">
                            <input type="color" value={state.activeStrokeColor} onChange={(e) => updateState({ activeStrokeColor: e.target.value })} />
                            <div className="color-preview" style={{ backgroundColor: state.activeStrokeColor }} />
                        </div>
                    </div>
                    {/* Fill Color - only for rect tool */}
                    {(state.activeTool === 'rect' || state.activeTool === 'pen' || state.activeTool === 'highlighter') && (
                        <div className="property-item">
                            <div className="color-picker-wrapper">
                                <button
                                    className={`transparent-btn ${state.activeFillColor === 'transparent' ? 'active' : ''}`}
                                    onClick={() => updateState({
                                        activeFillColor: state.activeFillColor === 'transparent' ? '#ffffff' : 'transparent'
                                    })}
                                    title={state.activeFillColor === 'transparent' ? '啟用填滿' : '無填滿'}
                                    style={{ marginLeft: '4px' }}
                                >
                                    <Slash size={14} />
                                </button>
                                {state.activeFillColor !== 'transparent' && (
                                    <input
                                        type="color"
                                        value={state.activeFillColor}
                                        onChange={(e) => updateState({ activeFillColor: e.target.value })}
                                        disabled={state.activeFillColor === 'transparent'}
                                        style={{ opacity: state.activeFillColor === 'transparent' ? 0.5 : 1 }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    <div className="property-item">
                        <input type="range" min="1" max="20" value={state.activeStrokeWidth} onChange={(e) => updateState({ activeStrokeWidth: Number(e.target.value) })} className="size-slider" />
                        <span className="value-label">{state.activeStrokeWidth}px</span>
                    </div>

                    {/* Opacity Slider for Highlighter/Pen/Rect */}
                    {(state.activeTool === 'highlighter' || state.activeTool === 'pen' || state.activeTool === 'rect') && (
                        <div className="property-item">
                            <label style={{ fontSize: '12px', marginRight: '8px' }}>透明度</label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={state.activeOpacity}
                                onChange={(e) => updateState({ activeOpacity: Number(e.target.value) })}
                                className="size-slider"
                            />
                            <span className="value-label">{Math.round(state.activeOpacity * 100)}%</span>
                        </div>
                    )}

                    {state.activeTool === 'text' && (
                        <>
                            <div className="separator" />
                            <div className="property-item">
                                <select value={state.activeFontFamily} onChange={handleFontChange} className="font-select">
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times-Roman">Times New Roman</option>
                                    <option value="Courier">Courier</option>
                                    <option value="Noto Sans TC">思源黑體 (繁中)</option>
                                </select>
                            </div>
                            <div className="property-item">
                                <input type="number" min="8" max="72" value={state.activeFontSize} onChange={(e) => updateState({ activeFontSize: Number(e.target.value) })} className="number-input" />
                                <span className="unit">pt</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="spacer" />

                {/* Zoom */}
                <div className="tool-group">
                    <button className="tool-btn" onClick={onZoomOut}><ZoomOut size={16} /></button>
                    <span className="zoom-label">{Math.round(state.scale * 100)}%</span>
                    <button className="tool-btn" onClick={onZoomIn}><ZoomIn size={16} /></button>
                </div>

                <div className="separator" />

                <button className="action-btn primary" onClick={onExport}>
                    <Download size={18} />
                    <span>Export PDF</span>
                </button>

                <button className="action-btn" onClick={onExportWord} title="匯出為 Word 文檔 (.docx)">
                    <FileText size={18} />
                    <span>Export Word</span>
                </button>

                <button className="action-btn" onClick={onOCR} title="OCR 文字辨識">
                    <ScanText size={18} />
                    <span>OCR</span>
                </button>
            </div>
        </div>
    );
};
