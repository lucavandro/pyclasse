"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";

// Exercise code must remain inside the controlled learning environment.
const blockClipboard = EditorView.domEventHandlers({
  copy(event) {
    event.preventDefault();
    return true;
  },
  cut(event) {
    event.preventDefault();
    return true;
  },
  paste(event) {
    event.preventDefault();
    return true;
  },
});

export function PythonEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <CodeMirror
      value={value}
      height="350px"
      extensions={[python(), blockClipboard]}
      onChange={onChange}
      theme="dark"
    />
  );
}
