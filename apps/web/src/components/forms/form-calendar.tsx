"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Control, FieldValues, Path } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "../ui/calendar";

type FormCalendarProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  startMonth?: Date;
  endMonth?: Date;
};

export function FormCalendar<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
  startMonth = new Date(1950, 0), // Januari 1950
  endMonth = new Date(new Date().getFullYear() - 16, 11), // 16 tahun yang lalu (paling muda),
}: FormCalendarProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="mb-1">
            {label ?? "Date"}
            <span className="text-red-500">*</span>
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  type="button"
                  variant={"outline"}
                  className={cn(
                    "border-muted-foreground/50 h-10 w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(field.value, "PPP")
                  ) : (
                    <span>{placeholder ?? "Pilih tanggal"}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="z-3000 w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={
                  disabled ??
                  ((date: Date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < new Date("1900-01-01") || date < today;
                  })
                }
                captionLayout="dropdown"
                startMonth={startMonth}
                endMonth={endMonth}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
