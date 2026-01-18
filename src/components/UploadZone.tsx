import React, { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import './UploadZone.css';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      onFileSelect(files[0]);
    } else {
      alert('請上傳有效的 PDF 檔案。');
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('請上傳有效的 PDF 檔案。');
      }
    }
  }, [onFileSelect]);

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        accept="application/pdf"
        onChange={handleFileInput}
        hidden
      />
      <label htmlFor="file-upload" className="upload-content">
        <div className="icon-wrapper">
          {isDragging ? <FileText size={48} color="var(--accent-primary)" /> : <Upload size={48} color="var(--text-secondary)" />}
        </div>
        <h3>{isDragging ? '請放開 PDF' : '上傳 PDF'}</h3>
        <p>拖曳檔案至此，或點擊選擇檔案</p>
        <div className="badges" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <span style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '0.8rem' }}>免費使用</span>
          <span style={{ padding: '4px 8px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '0.8rem' }}>無需上傳伺服器</span>
        </div>
      </label>
    </div>
  );
};
