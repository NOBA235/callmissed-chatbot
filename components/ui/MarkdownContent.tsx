"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./CodeBlock";

interface Props {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownContent({ content, isStreaming }: Props) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Override code to use our custom CodeBlock for fenced blocks
          code({ className, children, ...props }) {
            const isInline = !className;
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match?.[1];
            const text = String(children).replace(/\n$/, "");

            if (isInline) {
              return (
                <code {...props} className={className}>
                  {children}
                </code>
              );
            }

            return <CodeBlock language={language}>{text}</CodeBlock>;
          },
          // Prevent rehype-highlight wrapping from doubling the pre
          pre({ children }) {
            return <>{children}</>;
          },
          // Open links in new tab
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="streaming-cursor"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
