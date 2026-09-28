# JSON Formatter & Validator

**Live demo:** https://json-formatter-beta-pearl.vercel.app (Vercel) · [GitHub Pages mirror](https://babug01.github.io/json-formatter/)

A fast, focused JSON formatter, minifier, and validator — a real code editor instead of a plain
textarea, a collapsible tree view for exploring large payloads, and error messages that point at
the exact line and column, not just "unexpected token". Runs entirely in the browser; nothing you
paste ever leaves your machine.

## Features

- **Format / Beautify** with a choice of 2-space, 4-space, or tab indentation
- **Minify / Compact** to strip whitespace
- **Validate** without reformatting — useful for checking a large file quickly
- **Tree View** — a collapsible explorer for the parsed structure, available as a direct action, not
  hidden behind a toggle you'd only find after already formatting once
- **Precise error locations** — `JSON.parse`'s native error message isn't one consistent shape across
  engines and error types; this normalizes three different message formats (explicit line/column,
  a raw character offset, or a bare excerpt of the offending text) into a single "line L, column C"
  location
- Upload a `.json` file or paste directly; download the formatted result
- Dark / light theme, synced to your system preference

## Why I built this

I kept reaching for jsonformatter.org for the same handful of operations and wanted something with
a real editor (line numbers, syntax highlighting) instead of a bare `<textarea>`, plus a tree view
that's actually easy to find. This is also one piece of a larger internal DevOps tool I built at
work consolidating the utility pages a platform engineer reaches for daily (JSON/YAML/XML
formatters, IP/CIDR calculators, cron checkers, certificate and JWT decoders) into one place — this
repo is the JSON formatter piece, cleaned up and open-sourced on its own.

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [CodeMirror 6](https://codemirror.net/) (via `@uiw/react-codemirror`) for the editor panes

## Running locally

```bash
git clone https://github.com/Babug01/json-formatter.git
cd json-formatter
npm install
npm run dev
```

## License

MIT — see [LICENSE](LICENSE).
