import { useEffect, useState } from "react";

interface HealthResponse {
  status: string;
  environment: string;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-4">
        <div className="inline-block px-3 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full">
          Increment 0 • Platform Foundation
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Placement, Training &amp; Career Platform
        </h1>
        <p className="text-sm text-slate-600">
          Modular Monolith (FastAPI + PostgreSQL + Redis) paired with React + TypeScript + Vite.
        </p>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Backend API Status:</span>
          {health ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              ● Connected ({health.environment})
            </span>
          ) : error ? (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium">
              ● Offline ({error})
            </span>
          ) : (
            <span className="text-slate-400">Checking...</span>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;