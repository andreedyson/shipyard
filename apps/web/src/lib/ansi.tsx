import React from "react";

const ANSI_FG: Record<number, string> = {
  30: "text-zinc-500",
  31: "text-red-400",
  32: "text-emerald-400",
  33: "text-amber-400",
  34: "text-sky-400",
  35: "text-purple-400",
  36: "text-cyan-400",
  37: "text-zinc-200",
  90: "text-zinc-500",
  91: "text-red-300",
  92: "text-emerald-300",
  93: "text-amber-300",
  94: "text-sky-300",
  95: "text-purple-300",
  96: "text-cyan-300",
  97: "text-white",
};

const ANSI_BG: Record<number, string> = {
  40: "bg-zinc-900",
  41: "bg-red-950/60",
  42: "bg-emerald-950/60",
  43: "bg-amber-950/60",
  44: "bg-sky-950/60",
  45: "bg-purple-950/60",
  46: "bg-cyan-950/60",
  47: "bg-zinc-800",
};

export interface AnsiSpan {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/**
 * Strips ANSI escape sequences and orphaned bracket codes from a raw log string.
 */
export function stripAnsi(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/(?:^|\s)\[([0-9;]+)m/g, "")
    .replace(/\r/g, "");
}

/**
 * Parses a string containing ANSI escape codes or stripped bracket sequences into structured styled spans.
 */
export function parseAnsiSpans(text: string): AnsiSpan[] {
  if (!text) return [];

  // Remove non-SGR escape codes (e.g. cursor hide/show, screen clear, etc.)
  const cleaned = text
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, (match) => {
      if (match.endsWith("m")) return match;
      return "";
    })
    .replace(/\r/g, "");

  // Match both standard \u001b[...m and bracket codes like [1m, [34m that may have lost the ESC byte
  const regex = /(?:\u001b\[|(?<=^|\s)\[)([0-9;]+)m/g;
  const spans: AnsiSpan[] = [];
  let lastIndex = 0;

  let currentFg: string | undefined;
  let currentBg: string | undefined;
  let isBold = false;
  let isDim = false;
  let isItalic = false;
  let isUnderline = false;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = cleaned.slice(lastIndex, match.index);
      if (textChunk.length > 0) {
        spans.push({
          text: textChunk,
          fg: currentFg,
          bg: currentBg,
          bold: isBold,
          dim: isDim,
          italic: isItalic,
          underline: isUnderline,
        });
      }
    }

    const codes = match[1].split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) {
        currentFg = undefined;
        currentBg = undefined;
        isBold = false;
        isDim = false;
        isItalic = false;
        isUnderline = false;
      } else if (code === 1) {
        isBold = true;
      } else if (code === 2) {
        isDim = true;
      } else if (code === 3) {
        isItalic = true;
      } else if (code === 4) {
        isUnderline = true;
      } else if (code === 22) {
        isBold = false;
        isDim = false;
      } else if (code === 23) {
        isItalic = false;
      } else if (code === 24) {
        isUnderline = false;
      } else if (code === 39) {
        currentFg = undefined;
      } else if (code === 49) {
        currentBg = undefined;
      } else if (ANSI_FG[code]) {
        currentFg = ANSI_FG[code];
      } else if (ANSI_BG[code]) {
        currentBg = ANSI_BG[code];
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    const remaining = cleaned.slice(lastIndex);
    if (remaining.length > 0) {
      spans.push({
        text: remaining,
        fg: currentFg,
        bg: currentBg,
        bold: isBold,
        dim: isDim,
        italic: isItalic,
        underline: isUnderline,
      });
    }
  }

  return spans;
}

function renderTextWithHighlight(
  text: string,
  searchQuery?: string,
): React.ReactNode {
  if (!searchQuery || !searchQuery.trim()) {
    return text;
  }

  const query = searchQuery.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const parts: React.ReactNode[] = [];
  let startIndex = 0;
  let foundIndex = lowerText.indexOf(lowerQuery, startIndex);

  if (foundIndex === -1) {
    return text;
  }

  while (foundIndex !== -1) {
    if (foundIndex > startIndex) {
      parts.push(text.slice(startIndex, foundIndex));
    }
    parts.push(
      <mark
        key={foundIndex}
        className="rounded-xs bg-amber-400/35 px-0.5 text-amber-100 ring-1 ring-amber-400/50"
      >
        {text.slice(foundIndex, foundIndex + query.length)}
      </mark>,
    );
    startIndex = foundIndex + query.length;
    foundIndex = lowerText.indexOf(lowerQuery, startIndex);
  }

  if (startIndex < text.length) {
    parts.push(text.slice(startIndex));
  }

  return <>{parts}</>;
}

export function AnsiRenderer({
  text,
  searchQuery,
}: {
  text: string;
  searchQuery?: string;
}) {
  const spans = parseAnsiSpans(text);

  if (spans.length === 0) {
    return renderTextWithHighlight(text, searchQuery);
  }

  return (
    <>
      {spans.map((span, index) => {
        const classes = [
          span.fg,
          span.bg,
          span.bold && "font-semibold",
          span.dim && "opacity-60",
          span.italic && "italic",
          span.underline && "underline decoration-zinc-500",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span key={index} className={classes || undefined}>
            {renderTextWithHighlight(span.text, searchQuery)}
          </span>
        );
      })}
    </>
  );
}
