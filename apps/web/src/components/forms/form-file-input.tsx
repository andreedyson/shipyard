import { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";

export function FormFileInput<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { onChange, ...fieldProps } }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  onChange(e.target.files[0]);
                } else {
                  onChange(undefined);
                }
              }}
              // drop value from fieldProps
              {...{ ...fieldProps, value: undefined }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
