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

  // Sync with initialData if it changes significantly
  useEffect(() => {
    const initialJson = JSON.stringify(initialData);
    if (initialJson !== lastSavedData.current) {
        // If initialData changed and it's different from what we last saved, 
        // it means it was updated externally (e.g. by another user or a refresh).
        // We should update our local state to reflect that, BUT we need to be careful not to overwrite user's unsaved work.
        // Since we debounce, 'data' might be ahead of 'initialData'.
        
        // For now, let's only update if we are not in the middle of editing? 
        // Or simply update lastSavedData so we don't re-save.
        lastSavedData.current = initialJson;
        
        // If we want to reflect external changes:
        // setData(initialData); 
        // But this is dangerous. Let's assume for this specific issue (notes not saving), 
        // the problem might be that 'initialData' is not being updated after save, 
        // so the hook thinks nothing changed on next edit?
        
        // Actually, if onSave is successful, we update lastSavedData. 
        // If parent re-renders with new initialData (which should match lastSavedData), nothing happens.
        // If parent re-renders with OLD initialData, we might have a conflict.
        
        // Let's trust that onSave updates the parent state eventually.
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

  return {
    data,
    setData,
    handleChange,
    updateData,
    saveState,
  };
}
