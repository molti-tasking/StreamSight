'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div id="error-page" className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Something went wrong!</h1>
      <p className="mb-4">Sorry, an unexpected error has occurred.</p>
      <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
        {error.message}
        {error.digest && <span> (Digest: {error.digest})</span>}
      </pre>
      <button
        className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}