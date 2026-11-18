import SandboxWorkspace from '../../../components/SandboxWorkspace';

export const metadata = { title: 'SolidCraft CAD sandbox · shCode' };

export default function CadSandboxPage() {
  return <SandboxWorkspace initialMode="reshape" />;
}
