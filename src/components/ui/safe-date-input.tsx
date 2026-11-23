import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  dateFromDateKey,
  isValidCalendarYearDateKey,
  toLocalDateKey,
} from "@/utils/implementation-phase1";

export interface SafeDateInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value?: Date | string | null;
  onDateChange: (date: Date | undefined) => void;
  minYear?: number;
  maxYear?: number;
}

/**
 * Wrapper seguro para `<input type="date">` que evita:
 * 1) Erro de formato `"yyyy-MM-dd"` causado por anos sem padding de 4 dígitos (ex: `"2-12-14"`)
 * 2) Gravação/disparo de automações ou refetch durante digitação parcial do ano (`0002`, `0020`, `0202`)
 * Ao desfocar com data incompleta, restaura o último valor válido recebido por props.
 */
const SafeDateInput = React.forwardRef<HTMLInputElement, SafeDateInputProps>(
  (
    {
      value,
      onDateChange,
      minYear = 1900,
      maxYear = 2099,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const normalizedExternalValue = React.useMemo(() => {
      const key = toLocalDateKey(value);
      if (!key || !isValidCalendarYearDateKey(key, minYear, maxYear)) {
        return "";
      }
      return key;
    }, [value, minYear, maxYear]);

    const [draftValue, setDraftValue] = React.useState(normalizedExternalValue);
    const isFocusedRef = React.useRef(false);
    const lastExternalRef = React.useRef(normalizedExternalValue);

    React.useEffect(() => {
      if (normalizedExternalValue !== lastExternalRef.current) {
        lastExternalRef.current = normalizedExternalValue;
        if (!isFocusedRef.current) {
          setDraftValue(normalizedExternalValue);
        }
      }
    }, [normalizedExternalValue]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      if (
        draftValue !== "" &&
        !isValidCalendarYearDateKey(draftValue, minYear, maxYear)
      ) {
        setDraftValue(normalizedExternalValue);
      } else if (draftValue !== normalizedExternalValue && normalizedExternalValue !== "") {
        setDraftValue(normalizedExternalValue);
      }
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDraftValue(raw);

      if (!raw) {
        onDateChange(undefined);
        return;
      }

      if (isValidCalendarYearDateKey(raw, minYear, maxYear)) {
        onDateChange(dateFromDateKey(raw));
      }
    };

    return (
      <Input
        ref={ref}
        type="date"
        value={draftValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

SafeDateInput.displayName = "SafeDateInput";

export { SafeDateInput };
