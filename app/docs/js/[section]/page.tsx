import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getAllSectionSlugs, getSection, sections } from '../../../../lib/js-docs';
import JsDocsClient from './JsDocsClient';
import DocsFamilyBar from '../../../../components/DocsFamilyBar';

export function generateStaticParams() {
  return getAllSectionSlugs().map((section) => ({ section }));
}

export default async function JsDocsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = getSection(slug);
  if (!section) return notFound();
  return (
    <>
      <DocsFamilyBar currentId="js" />
      <Suspense fallback={<div className="docs-main">Loading…</div>}>
        <JsDocsClient
          section={section}
          allSections={sections}
          basePath="/docs/js"
          docsTitle="JavaScript reference"
          searchPlaceholder="Search the JavaScript docs…"
        />
      </Suspense>
    </>
  );
}
