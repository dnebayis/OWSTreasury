"use client";

import { Fragment } from "react";

/* ------------------------------------------------------------------ */
/*  Inline renderer: **bold**, `code`, _italic_, plain text            */
/* ------------------------------------------------------------------ */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Pattern order matters — backtick before bold/italic
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(<code key={match.index}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/* ------------------------------------------------------------------ */
/*  Table renderer                                                     */
/* ------------------------------------------------------------------ */
function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((l) => !l.match(/^\|[-| :]+\|$/)) // drop separator rows
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim())
    );
  if (rows.length === 0) return null;
  const [head, ...body] = rows;
  return (
    <table>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i}>{renderInline(h)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci}>{renderInline(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/*  Block renderer: headings, bullets, hr, paragraphs                 */
/* ------------------------------------------------------------------ */
type Block =
  | { kind: "code"; lang: string; code: string }
  | { kind: "table"; lines: string[] }
  | { kind: "h"; level: number; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "hr" }
  | { kind: "p"; text: string }
  | { kind: "blank" };

function parseBlocks(content: string): Block[] {
  // Extract fenced code blocks first
  const segments: Array<{ type: "text" | "code"; lang?: string; value: string }> = [];
  const fenceRe = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: content.slice(last, m.index) });
    segments.push({ type: "code", lang: m[1] || "", value: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ type: "text", value: content.slice(last) });

  const blocks: Block[] = [];

  for (const seg of segments) {
    if (seg.type === "code") {
      blocks.push({ kind: "code", lang: seg.lang ?? "", code: seg.value });
      continue;
    }

    const lines = seg.value.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // blank
      if (!line.trim()) { blocks.push({ kind: "blank" }); i++; continue; }

      // hr
      if (/^[-*_]{3,}$/.test(line.trim())) { blocks.push({ kind: "hr" }); i++; continue; }

      // heading
      const hm = line.match(/^(#{1,3})\s+(.*)/);
      if (hm) { blocks.push({ kind: "h", level: hm[1].length, text: hm[2] }); i++; continue; }

      // table group
      if (line.startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].startsWith("|")) {
          tableLines.push(lines[i]); i++;
        }
        blocks.push({ kind: "table", lines: tableLines });
        continue;
      }

      // unordered list
      if (/^[-*+]\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^[-*+]\s/, "").trim()); i++;
        }
        blocks.push({ kind: "ul", items }); continue;
      }

      // ordered list
      if (/^\d+\.\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\.\s/, "").trim()); i++;
        }
        blocks.push({ kind: "ol", items }); continue;
      }

      // paragraph (merge consecutive non-special lines)
      const pLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].startsWith("|") &&
        !lines[i].startsWith("#") &&
        !/^[-*+]\s/.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i]) &&
        !/^[-*_]{3,}$/.test(lines[i].trim())
      ) {
        pLines.push(lines[i]); i++;
      }
      if (pLines.length) blocks.push({ kind: "p", text: pLines.join("\n") });
    }
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  const blocks = parseBlocks(content);

  return (
    <div className="prose-chat space-y-0.5">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "blank":
            return <div key={i} className="h-2" />;

          case "hr":
            return <hr key={i} />;

          case "code":
            return (
              <pre key={i}>
                <code>{block.code}</code>
              </pre>
            );

          case "h":
            const Tag = `h${block.level}` as "h1" | "h2" | "h3";
            return <Tag key={i}>{renderInline(block.text)}</Tag>;

          case "table":
            return <MarkdownTable key={i} lines={block.lines} />;

          case "ul":
            return (
              <ul key={i} className="list-disc">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={i} className="list-decimal">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );

          case "p":
            return (
              <p key={i} className="leading-relaxed whitespace-pre-wrap">
                {renderInline(block.text)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
