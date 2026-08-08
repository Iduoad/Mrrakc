import { ArrowRight, Wrench } from 'lucide-react';
import type { DataType } from '../catalog';
import { toolsFor } from '../catalog';
import { href } from '../router';

// The tools available for one data type.
export default function DataTypePage({ dataType }: { dataType: DataType }) {
  const tools = toolsFor(dataType.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10 flex items-start gap-4">
        <div className="rounded-xl bg-terra/10 p-3 text-terra">
          <dataType.icon size={24} />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-black text-terra">{dataType.name}</h1>
          <p className="mt-2 text-sm text-charcoal-light dark:text-stone-400">
            {dataType.description}
          </p>
          <code className="mt-2 block font-mono text-xs text-stone-400">{dataType.dir}</code>
        </div>
      </header>

      {tools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-clay py-20 text-center dark:border-stone-800">
          <Wrench className="mx-auto mb-3 text-stone-300" size={40} />
          <p className="text-sm italic text-stone-400">
            No tools for {dataType.name.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={href(dataType.id, tool.id)}
              className="group flex items-center gap-4 rounded-2xl border border-clay bg-white p-5 transition-all hover:border-terra hover:shadow-lg dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="rounded-xl bg-terra/10 p-2.5 text-terra">
                <tool.icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif font-bold">{tool.name}</h2>
                <p className="mt-0.5 text-sm text-charcoal-light dark:text-stone-400">
                  {tool.description}
                </p>
              </div>
              <ArrowRight
                size={18}
                className="shrink-0 text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-terra"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
