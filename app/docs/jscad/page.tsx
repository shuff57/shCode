import { redirect } from 'next/navigation';
import { sections } from '../../../lib/jscad-docs';

export default function JscadDocsIndex() {
  redirect(`/docs/jscad/${sections[0].slug}`);
}
