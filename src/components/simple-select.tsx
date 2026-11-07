"use client";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SelectOption = { value: string; label: string };

type SimpleSelectProps = {
  options: SelectOption[];
  // Opção "vazia" no topo da lista (ex.: "Todos os nichos", "Sem nicho").
  emptyLabel?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  className?: string;
  invalid?: boolean;
  "aria-label"?: string;
};

// Select com lista de opções simples. Usa o Select do shadcn (Base UI).
export function SimpleSelect({
  options,
  emptyLabel,
  placeholder,
  name,
  id,
  value,
  defaultValue,
  onValueChange,
  className,
  invalid,
  "aria-label": ariaLabel,
}: SimpleSelectProps) {
  const items: { value: string | null; label: string }[] = emptyLabel
    ? [{ value: null, label: emptyLabel }, ...options]
    : options;

  return (
    <Select
      items={items}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.((next as string | null) ?? null)}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? "__empty"} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
