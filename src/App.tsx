import { useState } from 'react';

const features = [
  {
    title: 'Instant feedback',
    description:
      'Vite drives the renderer, so UI changes appear before you finish your thought.',
    meta: 'Renderer / Vite',
  },
  {
    title: 'Native shell',
    description:
      'Electron Forge packages the app with hardened defaults and a clean build path.',
    meta: 'Main / Forge',
  },
  {
    title: 'React 19',
    description:
      'Concurrent-ready UI with a component model that scales beyond the prototype.',
    meta: 'UI / React',
  },
];

type Feature = (typeof features)[number];

function FeatureCard({ title, description, meta }: Feature) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {meta}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        {description}
      </p>
    </article>
  );
}

export function App() {
  const [count, setCount] = useState(0);

  let status = 'Idle, waiting for input.';
  if (count > 0 && count < 4) status = 'Warming up the workflow.';
  if (count >= 4) status = 'Momentum achieved.';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            Rune Desktop
          </p>
          <h1 className="text-4xl font-semibold text-slate-50 sm:text-5xl">
            React 19 on Electron, now Tailwind-powered.
          </h1>
          <p className="text-base leading-relaxed text-slate-300">
            A production-ready renderer with modern tooling, tidy state, and a
            UI layer built for scale.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5"
              type="button"
              onClick={() => setCount((value) => value + 1)}
            >
              Add signal ({count})
            </button>
            <button
              className="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
              type="button"
              onClick={() => setCount(0)}
            >
              Reset state
            </button>
          </div>
          <p className="text-sm text-amber-300">{status}</p>
        </div>
        <section className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6 text-sm text-slate-400">
          <span>Renderer ready - Main process online</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            Stateful UI enabled
          </span>
        </footer>
      </div>
    </main>
  );
}
