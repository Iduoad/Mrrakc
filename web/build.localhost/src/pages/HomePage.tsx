import { ArrowRight } from 'lucide-react';
import { DATA_TYPES, toolsFor } from '../catalog';
import { href } from '../router';

// The index: one card per data type, each leading to the tools for it.
export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="font-serif text-3xl font-black text-terra">Local Tools</h1>
        <p className="mt-2 text-sm text-charcoal-light dark:text-stone-400">
          Tools that read and write this repository&rsquo;s <code className="font-mono text-xs">data/</code>{' '}
          directory directly. Pick the data you want to work on.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {DATA_TYPES.map((type) => {
          const count = toolsFor(type.id).length;
          return (
            <a
              key={type.id}
              href={href(type.id)}
              className="group flex flex-col rounded-2xl border border-clay bg-white p-5 transition-all hover:border-terra hover:shadow-lg dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-xl bg-terra/10 p-2.5 text-terra">
                  <type.icon size={20} />
                </div>
                <h2 className="flex-1 font-serif text-lg font-bold">{type.name}</h2>
                <ArrowRight
                  size={18}
                  className="text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-terra"
                />
              </div>
              <p className="flex-1 text-sm leading-relaxed text-charcoal-light dark:text-stone-400">
                {type.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                <code className="font-mono normal-case tracking-normal">{type.dir}</code>
                <span>&middot;</span>
                <span>{count === 1 ? '1 tool' : `${count} tools`}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
