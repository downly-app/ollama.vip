import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Copy,
  ExternalLink,
  Info,
} from 'lucide-react';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import React, { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import '../styles/markdown.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Copy button component
const CopyButton = React.memo(
  ({ codeToCopy, parentHovered }: { codeToCopy: string; parentHovered: boolean }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        if (!codeToCopy || codeToCopy.trim() === '') {
          // No code content to copy
          return;
        }
        // Copying code
        await navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        // Code copied successfully
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Copy failed
        // Fallback: use traditional copy method
        try {
          const textArea = document.createElement('textarea');
          textArea.value = codeToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);

          if (successful) {
            setCopied(true);
            // Code copied successfully (fallback)
            setTimeout(() => setCopied(false), 2000);
          } else {
            // Fallback copy also failed
          }
        } catch (fallbackErr) {
          // Fallback copy failed
        }
      }
    }, [codeToCopy]);

    return (
      <button
        onClick={handleCopy}
        className={`absolute top-2 right-2 p-2 rounded-lg bg-gray-800/80 text-gray-300 transition-all duration-200 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 backdrop-blur-sm ${
          parentHovered || copied ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    );
  }
);

// Alert box component
const AlertBox = React.memo(
  ({
    type,
    children,
  }: {
    type: 'info' | 'warning' | 'error' | 'success';
    children: React.ReactNode;
  }) => {
    const styles = {
      info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-200',
        icon: <Info size={16} className='text-blue-400' />,
      },
      warning: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-200',
        icon: <AlertTriangle size={16} className='text-yellow-400' />,
      },
      error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-200',
        icon: <AlertCircle size={16} className='text-red-400' />,
      },
      success: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-200',
        icon: <CheckCircle size={16} className='text-green-400' />,
      },
    };

    const style = styles[type];

    return (
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border ${style.bg} ${style.border} ${style.text} my-4`}
      >
        {style.icon}
        <div className='flex-1'>{children}</div>
      </div>
    );
  }
);

// Image component
const ImageComponent = React.memo(
  ({ src, alt, title }: { src?: string; alt?: string; title?: string }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    return (
      <div className='my-6 flex justify-center'>
        <div className='relative max-w-full'>
          {!loaded && !error && (
            <div className='absolute inset-0 flex items-center justify-center bg-gray-800/50 rounded-lg'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400'></div>
            </div>
          )}
          {error ? (
            <div className='flex items-center justify-center p-8 bg-gray-800/50 rounded-lg text-gray-400'>
              <AlertCircle size={24} className='mr-2' />
              <span>Image failed to load</span>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              title={title}
              className={`max-w-full h-auto rounded-lg shadow-lg transition-opacity duration-300 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              loading='lazy'
            />
          )}
        </div>
      </div>
    );
  }
);

const MarkdownRenderer = React.memo(({ content, className = '' }: MarkdownRendererProps) => {
  const processedContent = useMemo(() => {
    // Output original markdown content for debugging
    // Processing markdown content

    // Handle incomplete code blocks
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      return content + '\n```';
    }
    return content;
  }, [content]);

  // Detect alert box syntax
  const processAlerts = useCallback((content: string) => {
    return content.replace(
      /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/gm,
      (match, type, text) => {
        const alertType =
          type.toLowerCase() === 'note' || type.toLowerCase() === 'tip'
            ? 'info'
            : type.toLowerCase() === 'important'
              ? 'success'
              : type.toLowerCase() === 'warning'
                ? 'warning'
                : 'error';
        return `<div data-alert="${alertType}">${text}</div>`;
      }
    );
  }, []);

  const finalContent = useMemo(
    () => processAlerts(processedContent),
    [processedContent, processAlerts]
  );

  return (
    <div className={`markdown-content text-white prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeKatex,
          [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
        ]}
        components={{
          // Code blocks
          pre: ({ node, children, ...props }: any) => {
            const CodeBlock = () => {
              const [isHovered, setIsHovered] = useState(false);
              let language = '';
              let rawCode = '';

              const codeChild = React.Children.toArray(children).find(
                child => React.isValidElement(child) && child.type === 'code'
              ) as React.ReactElement | undefined;

              if (codeChild) {
                const className = codeChild.props.className || '';
                const match = /language-([\w-]+)/.exec(className);
                language = match ? match[1] : '';

                // Try multiple ways to extract code content
                const children = codeChild.props.children;
                if (typeof children === 'string') {
                  rawCode = children;
                } else if (Array.isArray(children)) {
                  rawCode = children.join('');
                } else if (children && typeof children === 'object' && children.props) {
                  rawCode = String(children.props.children || '');
                } else {
                  rawCode = String(children || '');
                }

                // Remove trailing newlines
                rawCode = rawCode.replace(/\n$/, '');

                // Code block extraction completed
              }

              // If still no code extracted, try to get from node
              if (!rawCode && node) {
                try {
                  // Try to extract from AST node
                  const textNode = node.children?.[0]?.children?.[0];
                  if (textNode && textNode.value) {
                    rawCode = textNode.value;
                    // Extracted code from AST node
                  }
                } catch (err) {
                  // Failed to extract code from AST node
                }
              }

              // Last fallback: extract all text content
              if (!rawCode) {
                const extractText = (element: any): string => {
                  if (typeof element === 'string') return element;
                  if (Array.isArray(element)) return element.map(extractText).join('');
                  if (element && element.props && element.props.children) {
                    return extractText(element.props.children);
                  }
                  return String(element || '');
                };

                rawCode = extractText(children);
                // Extracted code using fallback
              }

              return (
                <div
                  className='relative code-block-container my-6'
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <div className='rounded-xl border border-white/20 shadow-2xl overflow-hidden bg-[#0d1117] backdrop-blur-sm'>
                    {/* Code block header */}
                    <div className='h-12 bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-b border-white/10 flex items-center px-4'>
                      <div className='flex space-x-2 items-center'>
                        <div className='w-3 h-3 rounded-full bg-[#fc625d] shadow-sm' />
                        <div className='w-3 h-3 rounded-full bg-[#fdbc40] shadow-sm' />
                        <div className='w-3 h-3 rounded-full bg-[#35cd4b] shadow-sm' />
                      </div>
                      {language && (
                        <div className='ml-auto flex items-center gap-2'>
                          <span className='text-xs text-white/60 font-mono uppercase tracking-wide'>
                            {language}
                          </span>
                          <div className='w-px h-4 bg-white/20' />
                        </div>
                      )}
                    </div>

                    {/* Code content */}
                    <div className='relative'>
                      <pre
                        className='p-0 m-0 font-mono text-sm leading-relaxed overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500'
                        {...props}
                      >
                        {children}
                      </pre>
                      {rawCode && <CopyButton codeToCopy={rawCode} parentHovered={isHovered} />}
                    </div>
                  </div>
                </div>
              );
            };

            return <CodeBlock />;
          },

          // Inline code and multiline code
          code({ node, inline, className, children, ...props }: any) {
            // Ensure inline code is properly recognized
            const isInline = inline || !className || !className.includes('language-');

            if (isInline) {
              return (
                <code
                  className='bg-gradient-to-r from-white/10 to-white/5 text-orange-300 px-2 py-1 rounded-md text-sm font-mono border border-white/20 shadow-sm'
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const codeContent = String(children).replace(/\n$/, '');
            const lines = codeContent.split('\n');

            return (
              <div className='flex w-full rounded-r-lg overflow-hidden'>
                {/* Line numbers */}
                <div className='flex-none pr-4 pl-4 py-4 bg-gray-900/70 text-gray-500 select-none border-r border-white/10 text-right font-mono text-xs'>
                  {lines.map((_, i) => (
                    <div
                      key={i}
                      className='line-number py-0.5 leading-6 hover:text-gray-300 transition-colors'
                    >
                      {String(i + 1).padStart(2, ' ')}
                    </div>
                  ))}
                </div>
                {/* Code content */}
                <code
                  className={`${className} flex-1 block font-mono text-sm p-4 overflow-x-auto leading-6 bg-gray-900/30`}
                  {...props}
                >
                  {children}
                </code>
              </div>
            );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className='text-2xl font-bold text-white mb-6 mt-8 pb-3 border-b-2 border-gradient-to-r from-blue-500 to-purple-500 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className='text-xl font-semibold text-white mb-4 mt-6 pb-2 border-b border-white/20'>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className='text-lg font-medium text-white mb-3 mt-5'>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className='text-base font-medium text-white mb-2 mt-4'>{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className='text-sm font-medium text-white mb-2 mt-3'>{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className='text-sm font-medium text-white/90 mb-2 mt-3'>{children}</h6>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className='text-white/90 mb-4 leading-relaxed text-base'>{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className='list-none text-white/90 mb-4 space-y-2 ml-6'>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className='list-none text-white/90 mb-4 space-y-2 ml-6'>{children}</ol>
          ),
          li: ({ children, ...props }) => {
            // Check if it's a task list item
            const childrenStr = React.Children.toArray(children).join('');
            const isTaskList = typeof childrenStr === 'string' && /^\[[ x]\]/.test(childrenStr);

            if (isTaskList) {
              const isChecked = childrenStr.startsWith('[x]');
              const text = childrenStr.replace(/^\[[ x]\]\s*/, '');

              return (
                <li className='flex items-start gap-3 text-white/90 leading-relaxed'>
                  <input
                    type='checkbox'
                    checked={isChecked}
                    readOnly
                    className='mt-1 w-4 h-4 rounded border-white/30 bg-transparent text-blue-500 focus:ring-blue-500 focus:ring-2'
                  />
                  <span className={isChecked ? 'line-through text-white/60' : ''}>{text}</span>
                </li>
              );
            }

            return (
              <li className='flex items-start gap-3 text-white/90 leading-relaxed'>
                <span className='text-blue-400 mt-1 select-none'>•</span>
                <span className='flex-1'>{children}</span>
              </li>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className='border-l-4 border-blue-400 pl-6 py-4 my-6 bg-gradient-to-r from-blue-500/5 to-transparent rounded-r-lg relative'>
              <div className='absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-sm' />
              <div className='italic text-white/90 text-base leading-relaxed'>{children}</div>
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className='overflow-x-auto my-6 rounded-lg border border-white/20 shadow-lg'>
              <table className='min-w-full divide-y divide-white/20'>{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className='bg-gradient-to-r from-gray-800/80 to-gray-900/80'>{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className='bg-gray-900/30 divide-y divide-white/10'>{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className='hover:bg-white/5 transition-colors duration-150'>{children}</tr>
          ),
          th: ({ children }) => (
            <th className='px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-white/10 last:border-r-0'>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className='px-6 py-4 text-sm text-white/90 border-r border-white/10 last:border-r-0'>
              {children}
            </td>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              className='text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 inline-flex items-center gap-1 underline decoration-blue-400/50 hover:decoration-blue-300 underline-offset-2'
            >
              {children}
              {href?.startsWith('http') && <ExternalLink size={12} className='opacity-70' />}
            </a>
          ),

          // Emphasis
          strong: ({ children }) => (
            <strong className='font-semibold text-white bg-gradient-to-r from-yellow-400/20 to-orange-400/20 px-1 rounded'>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className='italic text-white/95 bg-gradient-to-r from-purple-400/10 to-pink-400/10 px-1 rounded'>
              {children}
            </em>
          ),

          // Strikethrough
          del: ({ children }) => <del className='line-through text-white/60'>{children}</del>,

          // Horizontal rule
          hr: () => (
            <hr className='my-8 border-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent' />
          ),

          // Images
          img: ({ src, alt, title }) => <ImageComponent src={src} alt={alt} title={title} />,

          // Custom alert box handling
          div: ({ children, ...props }) => {
            const alertType = (props as any)['data-alert'];
            if (alertType) {
              return <AlertBox type={alertType as any}>{children}</AlertBox>;
            }
            return <div {...props}>{children}</div>;
          },
        }}
      >
        {finalContent}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
