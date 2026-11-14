import SharedProgram from '../../components/SharedProgram';

export const metadata = { title: 'A program sent to you — shCode' };

// /shared?id=<id>: a sandbox program sent in a message (migration 0054). Query-string routing, since the
// static export cannot pre-render a page per id.
export default function SharedPage() {
  return <SharedProgram />;
}
