import { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { PdfEditor } from './components/PdfEditor';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);

  const loadTestPdf = async () => {
    try {
      const response = await fetch('/test.pdf');
      const blob = await response.blob();
      const testFile = new File([blob], 'test.pdf', { type: 'application/pdf' });
      setFile(testFile);
    } catch (e) {
      alert('Failed to load test.pdf');
    }
  };

  return (
    <div className="app-container">
      {!file ? (
        <div className="upload-container">
          <header className="app-header">
            <h1>PDF 編輯器</h1>
            <p>免費、免上傳，直接在瀏覽器中編輯您的 PDF。</p>
          </header>
          <UploadZone onFileSelect={setFile} />
        </div>
      ) : (
        <PdfEditor file={file} onBack={() => setFile(null)} />
      )}
    </div>
  );
}

export default App;
