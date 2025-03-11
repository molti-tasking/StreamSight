import Link from 'next/link';
import { ExplorationStuff } from './ExplorationStuff';
import { DataSettingsPopover } from './forms/DataSettingsPopover';
import { Toaster } from './ui/toaster';

export default function Navigation() {
  const routes = [
    { title: "Home", href: "/" },
    { title: "Streamclusters", href: "/streamclusters" },
    { title: "3D", href: "/anu" },
    { title: "Multi Line", href: "/multi-line" },
    { title: "Aggregation", href: "/aggregated-line" },
    { title: "Multi Aggregation", href: "/multi-aggregated-line" },
    { title: "Tree Map", href: "/multi-aggregated-treemap" },
  ];

  return (
    <>
      <Toaster />
      <nav className="bg-primary text-primary-foreground py-2">
        <div className="container flex items-center flex-wrap justify-between gap-x-6 gap-y-2">
          <div className="text-white flex items-center gap-4">
            <span className="font-semibold text-xl tracking-tight">
              Stream Sight
            </span>
            <ExplorationStuff />
          </div>

          <div className="flex flex-row gap-4">
            {routes.map((r) => (
              <Link
                className="text-sm hover:underline"
                key={r.href}
                href={r.href}
              >
                {r.title}
              </Link>
            ))}
          </div>
          <div className="flex-1"></div>
          <DataSettingsPopover />
        </div>
      </nav>
    </>
  );
}