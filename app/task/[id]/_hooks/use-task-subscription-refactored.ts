import { useCallback, useEffect, useState } from 'react';

interface UseTaskSubscriptionRefactoredProps {
  taskId: string;
}

export function useTaskSubscriptionRefactored({ taskId }: UseTaskSubscriptionRefactoredProps) {
  const [isConnected, setIsConnected] = useState(false);
  
  const connect = useCallback(() => {
    setIsConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (taskId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [taskId, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect
  };
}