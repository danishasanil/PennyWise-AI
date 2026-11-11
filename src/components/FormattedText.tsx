import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Lightweight, safe renderer that converts Markdown bold (**text**),
 * italic (*text*), inline code (`code`), and bullet lists into clean React elements.
 * Prevents raw asterisks from showing up in AI responses.
 */
export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split text into paragraphs / lines
  const lines = text.split('\n');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Bullet point check
        const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const content = isBullet ? trimmed.replace(/^([•\-\*]\s+)/, '') : line;

        // Parse inline markers: **bold**, *italic*, `code`
        const parts = parseInlineMarkdown(content);

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span className="text-emerald-600 font-bold select-none">•</span>
              <span className="flex-1">{parts}</span>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="leading-relaxed">
            {parts}
          </p>
        );
      })}
    </div>
  );
};

function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Regex matches **bold**, *italic*, and `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const tokens = text.split(regex);

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-inherit">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={idx} className="italic text-inherit">
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={idx}
          className="font-mono text-[11px] bg-slate-200/60 text-slate-800 px-1 py-0.5 rounded"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}
