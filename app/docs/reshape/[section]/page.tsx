import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getAllSectionSlugs, getSection, sections } from '../../../../lib/reshape-docs';
import DocsClient from '../../moshion/[section]/DocsClient';

export function generateStaticParams() {
  return getAllSectionSlugs().map((section) => ({ section }));
}

export default async function JscadDocsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = getSection(slug);
  if (!section) return notFound();
  return (
    <Suspense fallback={<div className="docs-main">Loading…</div>}>
      <DocsClient
        section={section}
        allSections={sections}
        basePath="/docs/reshape"
        docsTitle="JSCAD reference"
        searchPlaceholder="Search the JSCAD docs…"
        preview="jscad"
      />
    </Suspense>
  );
}
