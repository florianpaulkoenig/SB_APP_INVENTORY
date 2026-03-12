// ---------------------------------------------------------------------------
// AskAgent — floating action button that navigates to Intelligence Chat
// ---------------------------------------------------------------------------

import { useNavigate } from 'react-router-dom';

export function AskAgent() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/analytics/intelligence-chat')}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-900 text-white shadow-lg transition-all hover:bg-primary-800 hover:shadow-xl"
      title="Open Intelligence Chat"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 3a7 7 0 00-6.32 10.05L3 17l3.95-.68A7 7 0 1010 3z" />
        <circle cx="7" cy="10" r="0.75" fill="currentColor" />
        <circle cx="10" cy="10" r="0.75" fill="currentColor" />
        <circle cx="13" cy="10" r="0.75" fill="currentColor" />
      </svg>
    </button>
  );
}
