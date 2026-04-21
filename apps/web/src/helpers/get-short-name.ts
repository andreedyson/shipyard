export const getShortName = (
  name: string | null,
  maxWords: number = 2,
): string => {
  if (!name) return "";

  return name.trim().split(/\s+/).slice(0, maxWords).join(" ");
};
