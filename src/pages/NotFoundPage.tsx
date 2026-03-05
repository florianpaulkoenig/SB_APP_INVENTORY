import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// NotFoundPage -- 404
// ---------------------------------------------------------------------------
export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-7xl font-bold text-primary-900">404</h1>
      <p className="mt-3 text-lg text-primary-500">Page not found</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-800"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
