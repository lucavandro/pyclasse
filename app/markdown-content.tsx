"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PythonCodeBlock } from "./python-code-block";

export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children: label }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ),
          pre: ({ children: content }) => <>{content}</>,
          code: ({ className, children: content }) => {
            const source = String(content);
            const isBlock = Boolean(className) || source.endsWith("\n");
            return isBlock ? (
              <PythonCodeBlock
                code={source.replace(/\n$/, "")}
                ariaLabel="Snippet Python della traccia"
              />
            ) : (
              <code className={className}>{content}</code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
