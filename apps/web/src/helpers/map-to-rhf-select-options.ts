export function mapToOptions<T extends { id: number | string; name: string }>(
  items: T[] | undefined,
) {
  return items?.map((item) => ({
    label: item.name,
    value: item.id.toString(),
  }));
}
