'use client';

import { useEffect, useState, ReactNode } from 'react';
import { getCurrentUser } from '../lib/auth';

export default function TeacherOnly({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setShow(u?.role === 'teacher' || u?.role === 'admin');
    });
  }, []);

  if (!show) return null;
  return <>{children}</>;
}
