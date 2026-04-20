import { redirect } from 'next/navigation';
import { sections } from '../../../lib/q5play-docs';

export default function DocsIndex() {
  redirect(`/docs/q5play/${sections[0].slug}`);
}
