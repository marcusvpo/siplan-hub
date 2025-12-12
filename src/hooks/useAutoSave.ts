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
  const debouncedData = useDebounce(data, config.debounceMs || 500);
  const firstRender = useRef(true);
  const lastSavedData = useRef<string>(JSON.stringify(initialData));
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Ref to track current data for sync checks
  const currentDataRef = useRef<string>(JSON.stringify(initialData));
  
  // Keep currentDataRef in sync with data
  useEffect(() => {
    currentDataRef.current = JSON.stringify(data);
  }, [data]);

  // Sync with initialData if it changes significantly
  // This is important when the data is reloaded from the database (e.g., page refresh)
  useEffect(() => {
    const initialJson = JSON.stringify(initialData);
    
    // Only sync if:
    // 1. initialData is different from lastSavedData (external update happened)
    // 2. AND we don't have unsaved local changes (data matches lastSavedData)
    // This prevents overwriting user's pending edits
    if (initialJson !== lastSavedData.current) {
      // Check if we have local unsaved changes
      const hasLocalChanges = currentDataRef.current !== lastSavedData.current;
      
      if (!hasLocalChanges) {
        // No local changes, safe to sync with external data
        setData(initialData);
        lastSavedData.current = initialJson;
      } else {
        // We have local changes, just update the reference
        // but don't overwrite local state to preserve user's work
        lastSavedData.current = initialJson;
      }
    }
  }, [initialData]);


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

    return () => {
      // On unmount, if we have pending changes (debouncedData might be stale, check data vs lastSaved)
      // Actually, we can't reliably call async onSave on unmount because the component might be gone.
      // But we can try. Or better, we can force a save if data changed.
      // However, 'data' in this scope is closed over.
      // We need a ref to current data.
    };
  }, [debouncedData]);

  // Ref to track current data for unmount save
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    return () => {
      const currentJson = JSON.stringify(dataRef.current);
      if (currentJson !== lastSavedData.current) {
        // Attempt to save immediately on unmount
        // Note: This might fail if the parent component is also unmounting and invalidates callbacks.
        // But for tab switching, it should work.
        onSaveRef.current(dataRef.current);
      }
    };
  }, []);

  const handleChange = (field: keyof T, value: T[keyof T]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateData = (newData: T) => {
      setData(newData);
  }

  const hasUnsavedChanges = JSON.stringify(data) !== lastSavedData.current;

  return {
    data,
    setData,
    handleChange,
    updateData,
    saveState,
    hasUnsavedChanges
  };
}
