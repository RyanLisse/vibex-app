import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

export interface QueuedOperation {
  id: string;
  type: "insert" | "update" | "delete" | "batch";
  table: string;
  data: any;
  timestamp: Date;
  retries: number;
  maxRetries: number;
  lastError?: string;
}

export interface OfflineQueueState {
  operations: QueuedOperation[];
  size: number;
  status: "offline" | "syncing" | "synced" | "error";
  failedOperations: QueuedOperation[];
  deadLetterQueue: QueuedOperation[];
  lastSync: Date | null;
}

export interface OfflineQueueReturn extends OfflineQueueState {
  enqueue: (operation: Omit<QueuedOperation, "id">) => void;
  dequeue: () => QueuedOperation | undefined;
  clear: () => void;
  processQueue: () => Promise<void>;
  retryFailed: (operationId: string) => Promise<void>;
  moveToDeadLetter: (operationId: string) => void;
  getOperation: (operationId: string) => QueuedOperation | undefined;
  isOnline: boolean;
}

let operationId = 1;

export function useOfflineQueue(): OfflineQueueReturn {
  const queryClient = useQueryClient();
  const [operations, setOperations] = useState<QueuedOperation[]>([]);
  const [failedOperations, setFailedOperations] = useState<QueuedOperation[]>([]);
  const [deadLetterQueue, setDeadLetterQueue] = useState<QueuedOperation[]>([]);
  const [status, setStatus] = useState<OfflineQueueState["status"]>("synced");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const processingRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const enqueue = useCallback((operation: Omit<QueuedOperation, "id">) => {
    const queuedOperation: QueuedOperation = {
      ...operation,
      id: `op-${operationId++}`,
    };
    setOperations(prev => [...prev, queuedOperation]);
    if (!isOnline) setStatus("offline");
  }, [isOnline]);

  const dequeue = useCallback((): QueuedOperation | undefined => {
    let result: QueuedOperation | undefined;
    setOperations(prev => {
      if (prev.length === 0) return prev;
      result = prev[0];
      return prev.slice(1);
    });
    return result;
  }, []);

  const clear = useCallback(() => {
    setOperations([]);
    setFailedOperations([]);
    setStatus("synced");
  }, []);

  const moveToDeadLetter = useCallback((operationId: string) => {
    setOperations(prev => {
      const operation = prev.find(op => op.id === operationId);
      if (operation) {
        setDeadLetterQueue(prevDead => [...prevDead, operation]);
        return prev.filter(op => op.id !== operationId);
      }
      return prev;
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline || operations.length === 0) return;
    processingRef.current = true;
    setStatus("syncing");
    try {
      setOperations([]);
      setStatus("synced");
      setLastSync(new Date());
    } finally {
      processingRef.current = false;
    }
  }, [operations, isOnline]);

  const retryFailed = useCallback(async (operationId: string) => {
    const failedOperation = failedOperations.find(op => op.id === operationId);
    if (!failedOperation) return;
    setFailedOperations(prev => prev.filter(op => op.id !== operationId));
    setOperations(prev => [...prev, { ...failedOperation, retries: 0 }]);
  }, [failedOperations]);

  const getOperation = useCallback((operationId: string): QueuedOperation | undefined => {
    return operations.find(op => op.id === operationId) ||
           failedOperations.find(op => op.id === operationId) ||
           deadLetterQueue.find(op => op.id === operationId);
  }, [operations, failedOperations, deadLetterQueue]);

  return {
    operations,
    size: operations.length,
    status,
    failedOperations,
    deadLetterQueue,
    lastSync,
    enqueue,
    dequeue,
    clear,
    processQueue,
    retryFailed,
    moveToDeadLetter,
    getOperation,
    isOnline,
  };
}