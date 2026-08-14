import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';

self.onmessage = (e: MessageEvent) => {
  const { code, requestId } = e.data;
  const tokens = Prism.tokenize(code, Prism.languages.javascript);
  
  // We send back the tokens in a simplified format since Prism tokens 
  // are complex objects that might not serialize perfectly or 
  // efficiently. We'll just send the HTML string for now to keep it fast.
  
  const stringify = (token: any): string => {
    if (typeof token === 'string') return token;
    const content = Array.isArray(token.content)
      ? token.content.map((t: any) => stringify(t)).join('')
      : (typeof token.content === 'string' ? token.content : stringify(token.content));
    
    const alias = Array.isArray(token.alias) ? token.alias.join(' ') : token.alias || '';
    return `<span class="token ${token.type}${alias ? ' ' + alias : ''}">${content}</span>`;
  };

  const html = tokens.map((t: any) => stringify(t)).join('');
  self.postMessage({ html, requestId });
};
