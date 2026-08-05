import { redirect } from 'next/navigation';
import { sections } from '../../../lib/shplay-docs';

export default function DocsIndex() {
  redirect(`/docs/shplay/${sections[0].slug}`);
}
