import ClassLibraryPanel from '../../components/ClassLibraryPanel';

export const metadata = { title: 'Library — shCode' };

export default function LibraryPage() {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%' }}>
      <ClassLibraryPanel />
    </div>
  );
}
