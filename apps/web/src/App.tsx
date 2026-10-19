import { Route, Routes } from 'react-router';
import { GuestRoute, ProtectedRoute } from './components/AuthRoutes';
import { NotFoundPage } from './components/NotFoundPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { HomePage } from './features/home/HomePage';

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
