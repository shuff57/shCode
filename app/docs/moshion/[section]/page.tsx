import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getAllSectionSlugs, getSection, sections } from '../../../../lib/moshion-docs';
import DocsClient from './DocsClient';
import DocsFamilyBar from '../../../../components/DocsFamilyBar';
import DocsFrame from '../../../../components/DocsFrame';

export function generateStaticParams() {
  return getAllSectionSlugs().map((section) => ({ section }));
}

export default async function DocsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = getSection(slug);
  if (!section) return notFound();
  return (
    <DocsFrame>
      <Suspense fallback={<div className="docs-main">Loading…</div>}>
        <DocsClient
          tabs={<DocsFamilyBar currentId="moshion" />}
          section={section}
          allSections={sections}
          basePath="/docs/moshion"
          docsTitle="moSHion reference"
          searchPlaceholder="Search the moSHion docs…"
          preview="moshion"
        />
      </Suspense>
    </DocsFrame>
  );
}
