/** A BNF production rule: a non-terminal maps to an array of alternatives. */
export interface BNFRule {
  nonTerminal: string;
  /** Each alternative is a sequence of symbols (terminals or non-terminals). */
  alternatives: string[][];
}

/** A node in a parse tree. */
export interface ParseTreeNode {
  symbol: string;
  isTerminal: boolean;
  children: ParseTreeNode[];
}

/** A pseudocode token with its type and annotation. */
export interface PseudocodeToken {
  text: string;
  type: 'keyword' | 'variable' | 'operator' | 'comment' | 'literal' | 'function' | 'punctuation';
}

/** A single pseudocode line with tokens. */
export interface PseudocodeLine {
  lineNumber: number;
  indent: number;
  tokens: PseudocodeToken[];
  raw: string;
}
