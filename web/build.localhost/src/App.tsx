import { Suspense } from 'react';
import { ChevronRight, Hammer } from 'lucide-react';
import { dataTypeById, findTool } from './catalog';
import { href, useRoute } from './router';
import HomePage from './pages/HomePage';
import DataTypePage from './pages/DataTypePage';
import Loading from './components/Loading';

interface Crumb {
  label: string;
  to?: string;
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <header className="flex shrink-0 items-center gap-1.5 border-b border-clay bg-white/80 px-4 py-2.5 text-sm backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80">
      <a
        href={href()}
        className="flex items-center gap-2 font-serif font-bold text-terra hover:text-terra-dark"
      >
        <Hammer size={16} />
        Tools
      </a>
      {crumbs.map((crumb) => (
        <span key={crumb.label} className="flex items-center gap-1.5">
          <ChevronRight size={14} className="text-stone-300" />
          {crumb.to ? (
            <a href={crumb.to} className="text-charcoal-light hover:text-terra dark:text-stone-400">
              {crumb.label}
            </a>
          ) : (
            <span className="font-bold">{crumb.label}</span>
          )}
        </span>
      ))}
    </header>
  );
}

function NotFound({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24 text-center">
      <p className="text-sm italic text-stone-400">
        Unknown {what}. <a href={href()} className="text-terra underline">Back to the tools.</a>
      </p>
    </div>
  );
}

// Resolves the current hash route to a page and frames it with breadcrumbs.
export default function App() {
  const [dataTypeId, toolId] = useRoute();

  let crumbs: Crumb[] = [];
  let page = <HomePage />;
  // Full-bleed pages hand the whole content area to the tool (map editors and
  // the like); directory pages scroll normally.
  let fullBleed = false;

  if (dataTypeId) {
    const dataType = dataTypeById(dataTypeId);
    if (!dataType) {
      page = <NotFound what="data type" />;
    } else if (!toolId) {
      crumbs = [{ label: dataType.name }];
      page = <DataTypePage dataType={dataType} />;
    } else {
      const tool = findTool(dataType.id, toolId);
      crumbs = [{ label: dataType.name, to: href(dataType.id) }];
      if (!tool) {
        page = <NotFound what="tool" />;
      } else {
        crumbs.push({ label: tool.name });
        fullBleed = tool.fullBleed ?? false;
        page = (
          <Suspense fallback={<Loading label={`Loading ${tool.name}…`} />}>
            <tool.component />
          </Suspense>
        );
      }
    }
  }

  return (
    <div className="flex h-full flex-col bg-sand dark:bg-stone-950">
      <Breadcrumbs crumbs={crumbs} />
      <main className={`min-h-0 flex-1 ${fullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {page}
      </main>
    </div>
  );
}
