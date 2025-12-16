import React, { useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { AppRoutes } from './routes';
import { MainLayout } from './layouts/MainLayout';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { setTheme } from './store/slices/themeSlice';

const App: React.FC = () => {
  const theme = useAppSelector((state) => state.theme.theme);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize theme on mount
    dispatch(setTheme(theme));
  }, [dispatch, theme]);

  return (
    <Router>
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </Router>
  );
};

export default App;