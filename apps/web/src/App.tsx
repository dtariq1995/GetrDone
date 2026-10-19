import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { GuestRoute, ProtectedRoute } from './components/AuthRoutes';
import { NotFoundPage } from './components/NotFoundPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ListTaskView, TaskListView } from './features/tasks/TaskListView';
import { SMART_VIEWS } from './features/tasks/views';

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/today" replace />} />
          {SMART_VIEWS.map(({ view, path }) => (
            <Route
              key={view}
              path={path}
              // key: a fresh component (sort, search...) for each view.
              element={<TaskListView key={view} view={view} />}
            />
          ))}
          <Route path="/lists/:listId" element={<ListTaskView />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
