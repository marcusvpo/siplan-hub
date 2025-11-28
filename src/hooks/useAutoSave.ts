import { useState, useEffect, useRef } from "react";
import { useDebounce } from "./use-debounce";

export interface AutoSaveConfig {
  debounceMs?: number;
}

export interface SaveState {
  status: "idle" | "saving" | "success" | "error";
  message?: string;
  lastSavedAt?: Date;
}

export function useAutoSave<T>(
  initialData: T,
  onSave: (data: T) => Promise<void> | void,
  config: AutoSaveConfig = {}
) {
  const [data, setData] = useState<T>(initialData);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const debouncedData = useDebounce(data, config.debounceMs || 1000);
  const firstRender = useRef(true);
  const lastSavedData = useRef<string>(JSON.stringify(initialData));
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Sync with initialData if it changes significantly
  useEffect(() => {
    const initialJson = JSON.stringify(initialData);
    if (initialJson !== lastSavedData.current && initialJson !== JSON.stringify(data)) {
        // Only update if external data is different from current local data
        // This is a bit risky if user is typing. 
        // Ideally we only update if we are "pristine" or if we want to force update.
        // For now, let's respect local changes and only update if we haven't touched it?
        // Or just update `lastSavedData` so we don't save it back?
        // Let's assume initialData updates are from our own saves or background refreshes.
        // If background refresh, we might want to merge? 
        // For this task, let's just update `lastSavedData` to avoid re-saving what came from server.
        lastSavedData.current = initialJson;
        // And update local data? If we do, we overwrite user input.
        // Let's NOT update local data automatically to avoid conflicts, 
        // unless we implement a more complex merge strategy.
        // But if the user navigates away and back, initialData changes.
        // Let's just set data if it's the first load or if we explicitly want to reset.
        // For now, let's leave this effect minimal or manual.
    }
  }, [initialData, data]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const saveData = async () => {
      const currentJson = JSON.stringify(debouncedData);
      if (currentJson === lastSavedData.current) {
          return;
      }

      setSaveState({ status: "saving", message: "Salvando..." });
      
      let attempt = 0;
      const maxRetries = 3;
      
      while (attempt < maxRetries) {
        try {
          await onSaveRef.current(debouncedData);
          lastSavedData.current = currentJson;
          setSaveState({
            status: "success",
            message: "Salvo com sucesso",
            lastSavedAt: new Date(),
          });
          setTimeout(() => setSaveState(prev => prev.status === 'success' ? { ...prev, status: 'idle', message: undefined } : prev), 3000);
          return;
        } catch (error) {
          attempt++;
          if (attempt === maxRetries) {
            console.error("AutoSave Error:", error);
            setSaveState({
              status: "error",
              message: "Erro ao salvar",
            });
          } else {
            // Wait before retrying (500ms, 1000ms, etc.)
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }
      }
    };

    saveData();
  }, [debouncedData]);

  const handleChange = (field: keyof T, value: T[keyof T]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateData = (newData: T) => {
      setData(newData);
  }

  return {
    data,
    setData,
    handleChange,
    updateData,
    saveState,
  };
}
