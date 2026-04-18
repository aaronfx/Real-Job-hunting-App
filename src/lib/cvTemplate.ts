/**
 * Converts a tailored markdown CV into an ATS-friendly HTML document
 * ready for Puppeteer PDF printing.
 *
 * This is intentionally minimal and dependency-free so it runs in any context.
 */

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function mdLineToHtml(line: string): string {
  // bold
  let out = line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // inline links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function markdownToCvHtml(markdown: string, header?: { name?: string; tagline?: string }): string {
  const lines = markdown.split(/\r?\n/);
  const body: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      body.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      body.push(`<h3>${mdLineToHtml(escape(line.slice(4)))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      body.push(`<h2>${mdLineToHtml(escape(line.slice(3)))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      body.push(`<h1>${mdLineToHtml(escape(line.slice(2)))}</h1>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        body.push("<ul>");
        inList = true;
      }
      body.push(`<li>${mdLineToHtml(escape(line.replace(/^[-*]\s+/, "")))}</li>`);
    } else {
      closeList();
      body.push(`<p>${mdLineToHtml(escape(line))}</p>`);
    }
  }
  closeList();

  const headerHtml = header?.name
    ? `<header><h1 class="name">${escape(header.name)}</h1>${
        header.tagline ? `<p class="tagline">${escape(header.tagline)}</p>` : ""
      }</header>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>CV</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 10.5pt; line-height: 1.38; }
  header .name { font-size: 22pt; margin: 0; letter-spacing: -0.5px; }
  header .tagline { margin: 2px 0 16px 0; color: #555; }
  h1 { font-size: 16pt; margin: 14px 0 4px 0; }
  h2 { font-size: 12pt; margin: 14px 0 4px 0; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  h3 { font-size: 11pt; margin: 10px 0 2px 0; }
  p { margin: 2px 0 6px 0; }
  ul { margin: 2px 0 8px 0; padding-left: 16px; }
  li { margin: 1px 0; }
  a { color: #1f4fd6; text-decoration: none; }
  strong { color: #000; }
</style>
</head>
<body>
${headerHtml}
${body.join("\n")}
</body>
</html>`;
}
