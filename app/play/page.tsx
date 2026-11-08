import PlayGame from '../../components/PlayGame';

export const metadata = { title: 'Play — shCode' };

// /play?game=<id>: one game from the Games library. Query-string routing, since
// the static export cannot pre-render a page per game id.
export default function PlayPage() {
  return <PlayGame />;
}
