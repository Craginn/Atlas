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

  // Optimized: updateLine now modifies the array and fullText more efficiently
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

    // Efficient fullText update using slice instead of rebuildIndex
    const before = this.fullText.slice(0, line.start);
    const after = this.fullText.slice(line.start + line.length + 1); // +1 for \n
    this.fullText = before + newText + (index < this.lines.length - 1 ? '\n' : '') + after;
  }

  getFullText(): string {
    return this.fullText;
  }
}
