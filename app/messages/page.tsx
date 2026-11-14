import MessagesPage from '../../components/MessagesPage';

export const metadata = { title: 'Messages — shCode' };

// /messages (?c=<conversation id>): the envelope's Messages as a full page (migration 0055).
export default function MessagesRoute() {
  return <MessagesPage />;
}
