import ChangesPage from '../../components/ChangesPage';

export const metadata = { title: 'Changes — shCode' };

// /changes?id=<change id> or /changes?game=<game id>: proposed changes and History for the Games
// library. Query-string routing, since the static export cannot pre-render a page per id.
export default function Changes() {
  return <ChangesPage />;
}
