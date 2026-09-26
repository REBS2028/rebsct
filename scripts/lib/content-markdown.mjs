import MarkdownIt from 'markdown-it';

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function safeContentLink(value) {
  if (typeof value !== 'string' || !value || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return false;
  if (/^\/(?!\/)/.test(value) || /^#[a-zA-Z][\w-]*$/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

const markdown = new MarkdownIt('commonmark', { html: false, breaks: false });
markdown.disable(['image', 'heading', 'lheading']);
markdown.validateLink = (url) => {
  if (!safeContentLink(url)) throw new Error(`Unsupported content link: ${url}`);
  return true;
};
const originalLinkOpen = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
  if (/^https?:/i.test(tokens[index].attrGet('href'))) {
    tokens[index].attrSet('target', '_blank');
    tokens[index].attrSet('rel', 'noopener noreferrer');
  }
  return originalLinkOpen ? originalLinkOpen(tokens, index, options, environment, renderer) : renderer.renderToken(tokens, index, options);
};

export const renderMarkdown = (body) => markdown.render(body);

export function firstParagraphText(body) {
  const tokens = markdown.parse(body, {});
  const firstParagraph = tokens.findIndex((token) => token.type === 'paragraph_open');
  const inline = tokens[firstParagraph + 1];
  return (inline?.children || []).map((token) => ['softbreak', 'hardbreak'].includes(token.type) ? ' ' : ['text', 'code_inline'].includes(token.type) ? token.content : '').join('');
}
