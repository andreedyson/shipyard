import { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../ui/command";
import { useState } from "react";

export type SelectOption = {
  label: string;
  value: string;
};

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  isMulti?: boolean;
  defaultValue?: string | string[];
};

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  disabled,
  required = true,
  isMulti = false,
  defaultValue,
}: FormSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="mb-1">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </FormLabel>

          {/* Multi Select */}
          {isMulti ? (
            <FormControl>
              <MultiSelect
                value={(field.value ?? (defaultValue as string[])) || []}
                onChange={field.onChange}
                options={options}
                placeholder={placeholder}
                disabled={disabled}
                invalid={fieldState.invalid}
              />
            </FormControl>
          ) : (
            /* Single Select */
            <Select
              disabled={disabled}
              onValueChange={field.onChange}
              value={field.value ?? (defaultValue as string) ?? ""}
            >
              <FormControl>
                <SelectTrigger
                  className={cn(
                    "border-muted-foreground/50 h-auto min-h-10 w-full border py-2 text-left wrap-break-word whitespace-normal"
                  )}
                >
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="z-4000">
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function MultiSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  invalid,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toggleValue = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-full max-h-24 w-full justify-between text-left wrap-break-word whitespace-normal",
            invalid && "border-red-500 focus-visible:ring-red-500"
          )}
        >
          {value.length > 0
            ? options
                .filter((opt) => value.includes(opt.value))
                .map((opt) => opt.label)
                .join(", ")
            : placeholder || "Pilih opsi"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandEmpty className="grid w-50 place-items-center p-3">
            Tidak ada opsi.
          </CommandEmpty>
          <CommandGroup>
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                onSelect={() => toggleValue(opt.value)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(opt.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {opt.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
