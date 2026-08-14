export interface LineInfo {
  start: number;
  length: number;
  text: string;
}

export class LineManager {
  private lines: LineInfo[] = [];
  private fullText: string = '';

  constructor(text: string) {
    this.setFullText(text);
  }

  setFullText(text: string) {
    this.fullText = text;
    this.rebuildIndex();
  }

  private rebuildIndex() {
    this.lines = [];
    let start = 0;
    const lines = this.fullText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.lines.push({
        start,
        length: line.length,
        text: line
      });
      start += line.length + 1; // +1 for the \n
    }
  }

  getLine(index: number): LineInfo | undefined {
    return this.lines[index];
  }

  getLineCount(): number {
    return this.lines.length;
  }

  updateLine(index: number, newText: string) {
    const line = this.lines[index];
    if (!line) return;

    const diff = newText.length - line.length;
    line.text = newText;
    line.length = newText.length;

    // Update subsequent line starts
    for (let i = index + 1; i < this.lines.length; i++) {
      this.lines[i].start += diff;
    }

    // Update fullText
    const before = this.fullText.slice(0, line.start);
    const after = this.fullText.slice(line.start + line.length + (this.lines[index+1] ? 0 : 0)); // simplified
    // Note: fullText update is expensive, in a real Piece Table we'd avoid this.
    // For now, we maintain the string for compatibility with the existing Editor.
    this.rebuildIndex(); 
  }

  getFullText(): string {
    return this.fullText;
  }
}
