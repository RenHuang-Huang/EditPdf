import React from 'react';
import './StatusBar.css';
import type { ToolType } from '../types';

interface StatusBarProps {
    activeTool: ToolType;
    annotationCount: number;
    currentPage: number;
    totalPages: number;
    scale: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    activeTool,
    annotationCount,
    currentPage,
    totalPages,
    scale
}) => {
    const toolNames: Record<ToolType, string> = {
        'select': '選取',
        'text': '文字',
        'pen': '畫筆',
        'rect': '矩形',
        'line': '直線',
        'highlighter': '螢光筆',
        'eraser': '橡皮擦',
        'textOverlay': '文字編輯'
    };

    return (
        <div className="status-bar">
            <span className="status-item">
                <strong>目前工具:</strong> {toolNames[activeTool]}
            </span>
            <span className="status-separator">|</span>
            <span className="status-item">
                <strong>註釋:</strong> {annotationCount} 個
            </span>
            <span className="status-separator">|</span>
            <span className="status-item">
                Page {currentPage}/{totalPages}
            </span>
            <span className="status-separator">|</span>
            <span className="status-item">
                {Math.round(scale * 100)}%
            </span>
        </div>
    );
};
