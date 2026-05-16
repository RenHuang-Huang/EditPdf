import { HashRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { EditorPage } from './pages/EditorPage';
import { SocialHousingCalculatorPage } from './pages/SocialHousingCalculatorPage';
import './App.css'; // Global styles if any, or remove if specific to EditorPage

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<EditorPage />} />
        <Route path="/social-housing-calculator" element={<SocialHousingCalculatorPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
