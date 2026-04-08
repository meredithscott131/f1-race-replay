import { Routes, Route } from 'react-router-dom';
import RaceSelectPage from './pages/RaceSelectPage';
import DashboardPage from './pages/DashboardPage';
import './styles/variables.css';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<RaceSelectPage />} />
          <Route path="/race/:year/:round" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}
