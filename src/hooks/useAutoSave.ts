import { useState, useCallback } from 'react';
import { debounce } from 'lodash'; // Assuming lodash is available or we need to implement a simple debounce

// Simple debounce implementation if lodash is not desired/available, 
// but usually it's better to use a library. For now I'll assume we can use a custom one or import.
// Let's implement a simple one inside to be dependency-free for this snippet if needed, 
// but standard practice is lodash.debounce. I will use a custom implementation to avoid import errors if lodash isn't installed.

function customDebounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export interface AutoSaveConfig {
  debounceMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface SaveState {
  status: "idle" | "saving" | "success" | "error";
  message?: string;
  lastSavedAt?: Date;
}

export function useAutoSave<T extends Record<string, any>>(
  initialData: T,
  onSave: (data: T) => Promise<void>,
  config: AutoSaveConfig = { debounceMs: 1000, maxRetries: 3, retryDelayMs: 500 }
) {
  const [data, setData] = useState<T>(initialData);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const performSave = async (newData: T) => {
    setSaveState({ status: "saving", message: "Salvando..." });
    
    let lastError: Error | null = null;
    for (let i = 0; i < config.maxRetries; i++) {
      try {
        await onSave(newData);
        setSaveState({
          status: "success",
          message: `✓ Salvo em ${new Date().toLocaleTimeString()}`,
          lastSavedAt: new Date()
        });
        return; // Success
      } catch (error) {
        lastError = error as Error;
        if (i < config.maxRetries - 1) {
          await new Promise(r => setTimeout(r, config.retryDelayMs));
        }
      }
    }
    
    if (lastError) {
      setSaveState({
        status: "error",
        message: `⚠️ Erro: ${lastError.message}`
      });
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    customDebounce((newData: T) => {
      performSave(newData);
    }, config.debounceMs),
    [onSave, config.debounceMs, config.maxRetries, config.retryDelayMs]
  );

  const handleChange = (field: keyof T, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    debouncedSave(newData);
  };

  const updateData = (newData: T) => {
      setData(newData);
      debouncedSave(newData);
  }

  return { data, saveState, handleChange, updateData };
}
