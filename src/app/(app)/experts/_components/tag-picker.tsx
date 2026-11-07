"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeForCompare } from "@/lib/experts/normalize";
import { TagBadge } from "./badges";

const DEFAULT_COLOR = "#64748b";

type TagOption = { name: string; color: string };

// Escolha de tags: busca nas existentes ou cria uma nova digitando o nome.
// Envia os nomes escolhidos no formulário como vários campos "name".
export function TagPicker({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: TagOption[];
  defaultValue: string[];
}) {
  const [selected, setSelected] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const same = (a: string, b: string) => normalizeForCompare(a) === normalizeForCompare(b);
  const isSelected = (tag: string) => selected.some((item) => same(item, tag));
  const toggle = (tag: string) =>
    setSelected((current) =>
      current.some((item) => same(item, tag))
        ? current.filter((item) => !same(item, tag))
        : [...current, tag],
    );
  const colorOf = (tag: string) => options.find((option) => same(option.name, tag))?.color ?? DEFAULT_COLOR;

  const typed = query.trim();
  const canCreate = typed.length > 0 && !options.some((option) => same(option.name, typed)) && !isSelected(typed);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <span key={tag} className="inline-flex items-center">
          <TagBadge tag={{ name: tag, color: colorOf(tag) }} />
          <button
            type="button"
            onClick={() => toggle(tag)}
            className="-ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={`Remover tag ${tag}`}
          >
            <XIcon className="size-3" />
          </button>
          <input type="hidden" name={name} value={tag} />
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
          <PlusIcon /> Tag
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Buscar ou criar tag" value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>Digite um nome para criar a tag.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.name}
                    value={option.name}
                    data-checked={isSelected(option.name)}
                    onSelect={() => toggle(option.name)}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: option.color }} />
                    {option.name}
                  </CommandItem>
                ))}
                {canCreate && (
                  <CommandItem
                    value={`criar ${typed}`}
                    onSelect={() => {
                      toggle(typed);
                      setQuery("");
                    }}
                  >
                    <PlusIcon /> Criar “{typed}”
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
