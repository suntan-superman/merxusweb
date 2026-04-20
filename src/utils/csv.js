function escapeCsvValue(value) {
  const normalized =
    value == null
      ? ""
      : Array.isArray(value)
        ? value.join(" | ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildCsvString(rows = []) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) {
    return "";
  }

  const headers = Array.from(
    new Set(items.flatMap((item) => Object.keys(item || {})))
  );

  const lines = [
    headers.map((header) => escapeCsvValue(header)).join(","),
    ...items.map((item) =>
      headers.map((header) => escapeCsvValue(item?.[header])).join(",")
    ),
  ];

  return lines.join("\n");
}

export function downloadCsvFile(filename, rows = []) {
  const csv = buildCsvString(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
