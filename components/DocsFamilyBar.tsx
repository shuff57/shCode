import Link from 'next/link';
import { Box, Braces, Gamepad2, type LucideIcon } from 'lucide-react';
import { DOCS_FAMILY } from '../lib/docs-family';
import { libraryClasses as styles } from './library-ui';

// Same icons as the /docs hub's rail (components/DocsHub.tsx).
const ICONS: Record<string, LucideIcon> = { js: Braces, moshion: Gamepad2, reshape: Box };

// The family switcher at the top of every /docs/<set> page's main column. One Docs tab in
// the nav leads here; this bar moves between the reference sets, with the
// current set highlighted and the others one click away. The tabs wear the
// Library's type-tab look (.docs-family-tab in app/library.css).
export default function DocsFamilyBar({ currentId }: { currentId: string }) {
  return (
    <nav className={`${styles.typeTabs} docs-family-bar`} aria-label="Reference sets">
      {DOCS_FAMILY.map((m) => {
        const Icon = ICONS[m.id];
        return (
          <Link
            key={m.id}
            href={`/docs/${m.id}/${m.rootSection}`}
            aria-current={m.id === currentId ? 'page' : undefined}
            className="docs-family-tab"
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
