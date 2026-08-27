import { redirect } from 'next/navigation';
import { sections } from '../../../lib/reshape-docs';

export default function JscadDocsIndex() {
  redirect(`/docs/reshape/${sections[0].slug}`);
}
