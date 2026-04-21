import { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Button } from "../ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

type FormComboboxProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  options: Option[];
  disabled?: boolean;
  required?: boolean;
};

export function FormCombobox<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  disabled,
  required = true,
}: FormComboboxProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedOption = options.find((opt) => opt.value === field.value);

        return (
          <FormItem className="flex flex-col">
            <FormLabel>
              {label}
              {required && <span className="ml-0.5 text-red-500">*</span>}
            </FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className={cn(
                      "w-full justify-between truncate",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {selectedOption?.label || placeholder || "Select option"}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No option found.</CommandEmpty>
                    <CommandGroup>
                      {options.map((opt) => (
                        <CommandItem
                          key={opt.value}
                          value={opt.label}
                          onSelect={() => field.onChange(opt.value)}
                        >
                          {opt.label}
                          <Check
                            className={cn(
                              "ml-auto",
                              opt.value === field.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
