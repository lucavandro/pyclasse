"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export function PythonCodeBlock({
  code,
  ariaLabel = "Codice Python",
}: {
  code: string;
  ariaLabel?: string;
}) {
  return (
    <div className="python-code-block">
      <CodeMirror
        value={code}
        extensions={[
          python(),
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
        ]}
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
        theme="dark"
      />
    </div>
  );
}
