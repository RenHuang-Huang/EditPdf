import React from 'react';
import './KeyboardShortcutsModal.css';

interface KeyboardShortcutsModalProps {
    onClose: () => void;
}

interface Shortcut {
    key: string;
    description: string;
}

interface ShortcutGroup {
    title: string;
    shortcuts: Shortcut[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
    const shortcutGroups: ShortcutGroup[] = [
        {
            title: '工具切換',
            shortcuts: [
                { key: 'S', description: '選取工具 (Select)' },
                { key: 'T', description: '文字工具 (Text)' },
                { key: 'P', description: '畫筆工具 (Pen)' },
                { key: 'R', description: '矩形工具 (Rectangle)' },
                { key: 'L', description: '直線工具 (Line)' },
                { key: 'H', description: '螢光筆 (Highlighter)' },
                { key: 'E', description: '橡皮擦 (Eraser)' },
            ]
        },
        {
            title: '編輯操作',
            shortcuts: [
                { key: 'Ctrl + Z', description: '復原 (Undo)' },
                { key: 'Ctrl + Y', description: '重做 (Redo)' },
                { key: 'Ctrl + C', description: '複製選取物件' },
                { key: 'Ctrl + V', description: '貼上物件' },
                { key: 'Delete / Backspace', description: '刪除選取物件' },
                { key: 'Ctrl + A', description: '全選註釋' },
            ]
        },
        {
            title: '視圖控制',
            shortcuts: [
                { key: 'Ctrl + +', description: '放大' },
                { key: 'Ctrl + -', description: '縮小' },
            ]
        },
        {
            title: '其他',
            shortcuts: [
                { key: '?', description: '顯示快捷鍵說明 (此視窗)' },
                { key: 'ESC', description: '關閉彈窗 / 取消選取' },
            ]
        }
    ];

    return (
        <div className="shortcuts-modal-overlay" onClick={onClose}>
            <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
                <div className="shortcuts-header">
                    <h2>⌨️ 鍵盤快捷鍵</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="shortcuts-content">
                    {shortcutGroups.map((group, idx) => (
                        <div key={idx} className="shortcut-group">
                            <h3>{group.title}</h3>
                            <div className="shortcut-list">
                                {group.shortcuts.map((sc, i) => (
                                    <div key={i} className="shortcut-item">
                                        <kbd>{sc.key}</kbd>
                                        <span>{sc.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="shortcuts-footer">
                    <p>💡 提示：按 <kbd>?</kbd> 隨時開啟此說明</p>
                </div>
            </div>
        </div>
    );
};
