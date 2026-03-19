import { useCallback, useState } from 'react';

export function useActiveStudentSession() {
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  const handleDone = useCallback(() => {
    setActiveStudentId(null);
  }, []);

  return { activeStudentId, setActiveStudentId, handleDone };
}

