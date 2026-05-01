import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * MultiSelect component for shadcn/ui
 * 
 * @param {Array} options - [{ value: string, label: string }]
 * @param {Array} selected - [string]
 * @param {Function} onChange - (values: [string]) => void
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional classes for the trigger
 */
export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select items...",
  className,
  ...props
}) {
  const [open, setOpen] = React.useState(false)

  const handleUnselect = (item) => {
    onChange(selected.filter((i) => i !== item))
  }

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-10 px-3 py-2 bg-white dark:bg-zinc-950 hover:bg-white dark:hover:bg-zinc-950 border-input",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length > 0 ? (
              selected.map((item) => {
                const option = options.find((o) => o.value === item)
                return (
                  <Badge
                    variant="secondary"
                    key={item}
                    className="mr-1 mb-1 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(item)
                    }}
                  >
                    {option?.label || item}
                    <X className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                )
              })
            ) : (
              <span className="text-muted-foreground text-sm font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange(
                      selected.includes(option.value)
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value]
                    )
                    setOpen(true) // Keep open for multi-select
                  }}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-input",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "opacity-50"
                    )}
                  >
                    {selected.includes(option.value) && <Check className="h-4 w-4" />}
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
