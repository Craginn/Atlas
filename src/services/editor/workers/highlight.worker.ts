// Background highlighter for large files: tokenize + serialize JS off the main
// thread so typing in a big buffer never blocks on Prism.
//
// Uses the SAME highlighter as the main thread (services/editor/highlightJs) so
// async results are identical to the synchronous ones — rainbow brackets and
// HTML escaping included.

import { highlightJs } from '../highlightJs';

self.onmessage = (e: MessageEvent) => {
  const { code, requestId } = e.data;
  self.postMessage({ html: highlightJs(code), requestId });
};
