import { Link } from 'react-router';
import { FullPageMessage } from './FullPageMessage';

export function NotFoundPage() {
  return (
    <FullPageMessage>
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p>That page doesn't exist.</p>
      <Link to="/" className="font-medium text-indigo-600 hover:underline">
        Go home
      </Link>
    </FullPageMessage>
  );
}
