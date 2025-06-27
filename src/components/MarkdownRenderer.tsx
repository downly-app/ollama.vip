import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="markdown-content text-white prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Heading styles
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mb-3 border-b border-white/10 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium text-white mb-2">
              {children}
            </h3>
          ),
          
          // Paragraph styles
          p: ({ children }) => (
            <p className="text-white/90 mb-3 leading-relaxed">
              {children}
            </p>
          ),
          
          // Code block styles
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (inline) {
              return (
                <code 
                  className="bg-white/10 text-orange-300 px-1.5 py-0.5 rounded text-sm font-mono border border-white/20"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <div className="my-4">
                {language && (
                  <div className="bg-white/5 px-3 py-1 text-xs text-white/60 border-b border-white/10 rounded-t-lg font-mono">
                    {language}
                  </div>
                )}
                <pre className={`bg-black/30 p-4 rounded-lg ${language ? 'rounded-t-none' : ''} overflow-x-auto border border-white/10`}>
                  <code className="text-sm font-mono text-white/95" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          
          // List styles
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-white/90 mb-3 space-y-1 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-white/90 mb-3 space-y-1 ml-4">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-white/90 leading-relaxed">
              {children}
            </li>
          ),
          
          // Blockquote styles
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-4 bg-white/5 rounded-r-lg italic text-white/80">
              {children}
            </blockquote>
          ),
          
          // Table styles
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-white/20 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/10">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white/5">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-white/10">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-white font-medium border-r border-white/10 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-white/90 border-r border-white/10 last:border-r-0">
              {children}
            </td>
          ),
          
          // Link styles
          a: ({ children, href }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline font-medium"
            >
              {children}
            </a>
          ),
          
          // Emphasis styles
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/95">
              {children}
            </em>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 