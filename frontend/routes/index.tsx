import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import GameDetail from '../pages/GameDetail';
import Alerts from '../pages/Alerts';
import Scoreboard from '../pages/Scoreboard';
import Settings from '../pages/Settings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/game/:id" element={<GameDetail />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/scoreboard" element={<Scoreboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};

