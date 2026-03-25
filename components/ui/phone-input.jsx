"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDown } from "lucide-react"
import * as RPNInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import { getCountries } from "react-phone-number-input"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

/**
 * @deprecated Kept for backward compatibility. Prefer storing the full E.164
 * value returned by PhoneInput directly.
 */
export function normalizeIndianE164(value) {
  if (!value) return ""
  let digits = String(value).replace(/\D/g, "")
  if (digits.startsWith("91")) {
    digits = digits.slice(2)
  }
  digits = digits.replace(/^0+/, "").slice(0, 10)
  return digits ? `+91${digits}` : ""
}

const PhoneInput = React.forwardRef(
  ({ className, onChange, value, defaultCountry = "IN", disabled, ...props }, ref) => {
    const [country, setCountry] = React.useState(defaultCountry)

    React.useEffect(() => {
      setCountry(defaultCountry)
    }, [defaultCountry])

    const regionNames = React.useMemo(
      () =>
        typeof Intl !== "undefined"
          ? new Intl.DisplayNames(["en"], { type: "region" })
          : null,
      []
    )

    const countryOptions = React.useMemo(
      () =>
        getCountries().map((code) => ({
          value: code,
          label: regionNames?.of(code) || code,
        })),
      [regionNames]
    )

    return (
      <RPNInput.default
        ref={ref}
        className={cn("flex", className)}
        flagComponent={FlagComponent}
        countrySelectComponent={(selectProps) => (
          <CountrySelect
            {...selectProps}
            options={countryOptions}
            onChange={(code) => {
              selectProps.onChange(code)
              setCountry(code)
            }}
          />
        )}
        inputComponent={InputComponent}
        smartCaret={false}
        country={country}
        international
        withCountryCallingCode
        value={value || undefined}
        onChange={(next) => onChange?.(next || "")}
        disabled={disabled}
        {...props}
      />
    )
  }
)

PhoneInput.displayName = "PhoneInput"

const InputComponent = React.forwardRef(({ className, ...rest }, ref) => (
  <Input className={cn("rounded-s-none rounded-e-lg", className)} {...rest} ref={ref} />
))
InputComponent.displayName = "InputComponent"

const CountrySelect = ({ disabled, value: selectedCountry, options: countryList, onChange }) => {
  const scrollAreaRef = React.useRef(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover
      open={isOpen}
      modal={false}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (open) setSearchValue("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10"
          disabled={disabled}
        >
          <FlagComponent country={selectedCountry} countryName={selectedCountry} />
          <ChevronsUpDown
            className={cn("-mr-2 size-4 opacity-50", disabled ? "hidden" : "opacity-100")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 z-[100]"
        onFocusOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={(nextValue) => {
              setSearchValue(nextValue)
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]"
                  )
                  if (viewportElement) viewportElement.scrollTop = 0
                }
              }, 0)
            }}
            placeholder="Search country..."
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value: countryCode, label }) =>
                  countryCode ? (
                    <CountrySelectOption
                      key={countryCode}
                      country={countryCode}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}) => {
  const handleSelect = () => {
    onChange(country)
    onSelectComplete()
  }

  return (
    <CommandItem className="gap-2" onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <CheckIcon className={cn("ml-auto size-4", country === selectedCountry ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  )
}

const FlagComponent = ({ country, countryName }) => {
  const Flag = flags[country]

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag ? <Flag title={countryName} /> : null}
    </span>
  )
}

export { PhoneInput }
