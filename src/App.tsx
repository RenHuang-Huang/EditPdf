import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { SocialHousingCalculatorPage } from './pages/SocialHousingCalculatorPage';
import './App.css'; // Global styles if any, or remove if specific to EditorPage

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SocialHousingCalculatorPage />} />
        <Route path="/app" element={<EditorPage />} />
        <Route path="/social-housing-calculator" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
