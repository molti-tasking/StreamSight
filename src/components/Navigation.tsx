import Link from "next/link";
import { ExplorationStuff } from "./ExplorationStuff";
import { DataSettingsPopover } from "./forms/DataSettingsPopover";

export default function Navigation() {
  const routes = [{ title: "Streamclusters", href: "/streamclusters" }];

  return (
    <>
      <nav className="bg-primary text-primary-foreground py-2">
        <div className="container flex items-center flex-wrap justify-between gap-x-6 gap-y-2">
          <div className="text-white flex items-center gap-4">
            <Link href={"/"}>
              <span className="font-semibold text-xl tracking-tight">
                StreamSight
              </span>
            </Link>
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
