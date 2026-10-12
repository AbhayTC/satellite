// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import ConstellationView from './components/ConstellationView';
import ConjunctionTable from './components/ConjunctionTable';
import EventDetail from './components/EventDetail';
import ModelPerformance from './components/ModelPerformance';
import RiskCalculator from './components/RiskCalculator';
import LearningAgent from './components/LearningAgent';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="constellation" replace />} />
          <Route path="constellation" element={<ConstellationView />} />
          <Route path="table" element={<ConjunctionTable />} />
          <Route path="event/:eventId" element={<EventDetail />} />
          <Route path="performance" element={<ModelPerformance />} />
          <Route path="calculator" element={<RiskCalculator />} />
          <Route path="learning" element={<LearningAgent />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
