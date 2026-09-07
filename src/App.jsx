import { useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import TreeView from "./components/TreeView";
import Header from "./components/Header";

const REPO_URL = "https://github.com/Babug01/json-formatter";

function offsetToLineCol(text, pos) {
  const before = text.slice(0, pos);
  return { line: before.split("\n").length, col: pos - before.lastIndexOf("\n") };
}

// V8's JSON.parse error message isn't one fixed shape — verified against
// Node: "... in JSON at position N (line L column C)" gives both directly;
// older/shorter errors give only "at position N"; a third shape ("Unexpected
// token 'x', \"<verbatim, possibly ...-truncated snippet>\" is not valid
// JSON") gives no position at all, only a literal excerpt of the input —
// locate that excerpt via indexOf and derive line/col from where it actually
// appears. Falls back to no location (message alone still shown) rather
// than guessing.
function locateJsonError(text, message) {
  let m = message.match(/\(line (\d+) column (\d+)\)/);
  if (m) return { line: Number(m[1]), col: Number(m[2]) };

  m = message.match(/at position (\d+)/);
  if (m) return offsetToLineCol(text, Number(m[1]));

  m = message.match(/,\s*(?:\.\.\.)?"([\s\S]*)" is not valid JSON$/);
  if (m) {
    const idx = text.indexOf(m[1]);
    if (idx !== -1) return offsetToLineCol(text, idx);
  }
  return null;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// lineWrapping is required, not optional — without it, a long line (common
// in real-world JSON: regex strings, URLs) just overflows the editor's width
// with no visual indication there's more, since the outer layout clips
// overflow rather than growing the page. Wrapping keeps every character
// visible without needing horizontal scroll at all.
const cmExtensions = [json(), EditorView.lineWrapping];

const styles = {
  root: { height: "100dvh", boxSizing: "border-box", display: "flex", flexDirection: "column" },
  content: { fontFamily: "system-ui, sans-serif", padding: "20px 24px", flex: 1, minHeight: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", background: "var(--bg-subtle, #f0efed)" },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text, #1a1a1a)" },
  subtitle: { fontSize: 13, opacity: 0.55, margin: "4px 0 0", color: "var(--text, #1a1a1a)" },
  body: { display: "flex", gap: 16, flex: 1, minHeight: 0, minWidth: 0 },
  // minWidth/minHeight: 0 override flexbox's default "auto" min-size, which
  // otherwise lets a flex child grow to fit its content (a long unwrapped
  // line, a tall document) instead of respecting its allocated space — the
  // classic cause of content overflowing into, or pushing past, neighboring
  // elements like the button rail.
  pane: { flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 },
  paneHeader: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text, #1a1a1a)" },
  paneHeaderActions: { display: "flex", gap: 6 },
  iconBtn: {
    padding: "2px 10px", borderRadius: 6, border: "1px solid var(--border, #e5e7eb)", background: "transparent",
    color: "var(--text, #1a1a1a)", cursor: "pointer", fontSize: 11, textTransform: "none", fontWeight: 400,
  },
  editorWrap: { flex: 1, minHeight: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border, #e5e7eb)" },
  statusBar: { fontSize: 11, opacity: 0.5, marginTop: 6, color: "var(--text, #1a1a1a)" },
  empty: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, fontSize: 13,
    border: "1px dashed var(--border, #e5e7eb)", borderRadius: 8, color: "var(--text, #1a1a1a)",
  },
  errorBox: {
    flex: 1, padding: 16, borderRadius: 8, border: "1px solid #e05c5c", background: "rgba(224,92,92,0.08)",
    color: "#e05c5c", fontSize: 13, fontFamily: "'SFMono-Regular', Consolas, monospace", whiteSpace: "pre-wrap", overflow: "auto",
  },
  validBox: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 600,
    color: "#3fb950", border: "1px solid #3fb950", borderRadius: 8, background: "rgba(63,185,80,0.08)",
  },
  rail: { display: "flex", flexDirection: "column", gap: 10, width: 168, flexShrink: 0 },
  viewToggle: { display: "flex", border: "1px solid var(--border, #e5e7eb)", borderRadius: 6, overflow: "hidden" },
  viewToggleBtn: (active) => ({
    padding: "2px 10px", border: "none", background: active ? "var(--accent, #4f46e5)" : "transparent",
    color: active ? "#fff" : "var(--text, #1a1a1a)", cursor: "pointer", fontSize: 11,
  }),
  btn: (kind) => ({
    padding: "10px 14px", borderRadius: 6, border: kind === "primary" ? "none" : "1px solid var(--border, #e5e7eb)",
    background: kind === "primary" ? "var(--accent, #4f46e5)" : "transparent",
    color: kind === "primary" ? "#fff" : "var(--text, #1a1a1a)",
    cursor: "pointer", fontSize: 13, fontWeight: 600, width: "100%",
  }),
  select: {
    padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border, #e5e7eb)", background: "var(--input-bg, #f9fafb)",
    color: "var(--text, #1a1a1a)", fontSize: 13, width: "100%",
  },
  railDivider: { height: 1, background: "var(--border, #e5e7eb)", margin: "2px 0" },
};

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [parsedValue, setParsedValue] = useState(undefined);
  const [viewMode, setViewMode] = useState("code");
  const [error, setError] = useState(null);
  const [valid, setValid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [indentOption, setIndentOption] = useState("2");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const fileInputRef = useRef(null);

  function indentValue() {
    return indentOption === "tab" ? "\t" : Number(indentOption);
  }

  function resetResult() {
    setError(null);
    setValid(false);
    setOutput("");
    setParsedValue(undefined);
  }

  function format(mode) {
    if (!input.trim()) {
      resetResult();
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indentValue()));
      setParsedValue(parsed);
      setViewMode("code");
      setError(null);
      setValid(false);
    } catch (e) {
      setOutput("");
      setParsedValue(undefined);
      setValid(false);
      setError({ message: e.message, loc: locateJsonError(input, e.message) });
    }
  }

  // A direct rail action, not just a toggle that only appears once Format
  // has already been clicked — a toggle-only version means Tree View is
  // invisible until you've already produced Code output once.
  function showTree() {
    if (!input.trim()) {
      resetResult();
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indentValue()));
      setParsedValue(parsed);
      setViewMode("tree");
      setError(null);
      setValid(false);
    } catch (e) {
      setOutput("");
      setParsedValue(undefined);
      setValid(false);
      setError({ message: e.message, loc: locateJsonError(input, e.message) });
    }
  }

  function validate() {
    if (!input.trim()) {
      resetResult();
      return;
    }
    try {
      JSON.parse(input);
      setOutput("");
      setError(null);
      setValid(true);
    } catch (e) {
      setOutput("");
      setValid(false);
      setError({ message: e.message, loc: locateJsonError(input, e.message) });
    }
  }

  function clearAll() {
    setInput("");
    resetResult();
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInput(String(reader.result || ""));
      resetResult();
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-uploading the same filename
  }

  function handleCursorUpdate(viewUpdate) {
    if (!viewUpdate.selectionSet && !viewUpdate.docChanged) return;
    const head = viewUpdate.state.selection.main.head;
    const line = viewUpdate.state.doc.lineAt(head);
    setCursor({ line: line.number, col: head - line.from + 1 });
  }

  return (
    <div style={styles.root}>
      <Header title="JSON Formatter & Validator" repoUrl={REPO_URL} />
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>JSON Formatter &amp; Validator</h1>
          <p style={styles.subtitle}>Paste or upload JSON, format/minify/validate it, and see exactly where it breaks if it doesn't parse. Nothing leaves your browser.</p>
        </div>

        <div style={styles.body}>
          <div style={styles.pane}>
            <div style={styles.paneHeader}>
              <span>Input</span>
            </div>
            <div style={styles.editorWrap}>
              <CodeMirror
                value={input}
                height="100%"
                theme={oneDark}
                extensions={cmExtensions}
                onChange={(value) => setInput(value)}
                onUpdate={handleCursorUpdate}
                placeholder="Paste JSON here..."
                style={{ height: "100%", fontSize: 13 }}
              />
            </div>
            <div style={styles.statusBar}>Ln {cursor.line}, Col {cursor.col}</div>
            <input ref={fileInputRef} type="file" accept=".json,.txt,application/json" style={{ display: "none" }} onChange={handleFileChosen} />
          </div>

          <div style={styles.rail}>
            <button style={styles.btn("secondary")} onClick={handleUploadClick}>Upload Data</button>
            <button style={styles.btn("secondary")} onClick={validate}>Validate</button>
            <div style={styles.railDivider} />
            <select style={styles.select} value={indentOption} onChange={(e) => setIndentOption(e.target.value)}>
              <option value="2">2 space indent</option>
              <option value="4">4 space indent</option>
              <option value="tab">Tab indent</option>
            </select>
            <button style={styles.btn("primary")} onClick={() => format("pretty")}>Format / Beautify</button>
            <button style={styles.btn("secondary")} onClick={() => format("minify")}>Minify / Compact</button>
            <button style={styles.btn("secondary")} onClick={showTree}>Tree View</button>
            <div style={styles.railDivider} />
            <button style={styles.btn("secondary")} onClick={() => downloadText("formatted.json", output || input)}>Download</button>
            <button style={styles.btn("secondary")} onClick={clearAll}>Clear</button>
          </div>

          <div style={styles.pane}>
            <div style={styles.paneHeader}>
              <span>Output</span>
              <div style={styles.paneHeaderActions}>
                {output && (
                  <div style={styles.viewToggle}>
                    <button style={styles.viewToggleBtn(viewMode === "code")} onClick={() => setViewMode("code")}>Code</button>
                    <button style={styles.viewToggleBtn(viewMode === "tree")} onClick={() => setViewMode("tree")}>Tree</button>
                  </div>
                )}
                {output && viewMode === "code" && (
                  <button style={styles.iconBtn} onClick={copyOutput}>{copied ? "Copied" : "Copy"}</button>
                )}
              </div>
            </div>
            {error ? (
              <div style={styles.errorBox}>
                Invalid JSON{error.loc ? ` — line ${error.loc.line}, column ${error.loc.col}` : ""}
                {"\n\n"}
                {error.message}
              </div>
            ) : valid ? (
              <div style={styles.validBox}>Valid JSON</div>
            ) : output && viewMode === "tree" ? (
              <div style={styles.editorWrap}>
                <TreeView data={parsedValue} />
              </div>
            ) : output ? (
              <div style={styles.editorWrap}>
                <CodeMirror value={output} height="100%" theme={oneDark} extensions={cmExtensions} editable={false} readOnly style={{ height: "100%", fontSize: 13 }} />
              </div>
            ) : (
              <div style={styles.empty}>Formatted output will appear here.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
