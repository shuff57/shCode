import { redirect } from 'next/navigation';
import { sections } from '../../../lib/reshape-docs';

export default function ReshapeDocsIndex() {
  redirect(`/docs/reshape/${sections[0].slug}`);
}
