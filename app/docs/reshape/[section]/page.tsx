import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getAllSectionSlugs, getSection, sections } from '../../../../lib/reshape-docs';
import DocsClient from '../../moshion/[section]/DocsClient';
import DocsFamilyBar from '../../../../components/DocsFamilyBar';

export function generateStaticParams() {
  return getAllSectionSlugs().map((section) => ({ section }));
}

export default async function ReshapeDocsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = getSection(slug);
  if (!section) return notFound();
  return (
    <>
      <DocsFamilyBar currentId="reshape" />
      <Suspense fallback={<div className="docs-main">Loading…</div>}>
        <DocsClient
          section={section}
          allSections={sections}
          basePath="/docs/reshape"
          docsTitle="reSHape reference"
          searchPlaceholder="Search the reSHape docs…"
          preview="reshape"
        />
      </Suspense>
    </>
  );
}
