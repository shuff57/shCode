import { redirect } from 'next/navigation';
import { sections } from '../../../lib/moshion-docs';

export default function DocsIndex() {
  redirect(`/docs/moshion/${sections[0].slug}`);
}
