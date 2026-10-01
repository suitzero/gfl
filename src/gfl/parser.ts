import type { ASTNode } from './types';

export type TokenType = 'LPAREN' | 'RPAREN' | 'SYMBOL' | 'KEYWORD' | 'NUMBER' | 'STRING';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export class ParseError extends Error {
  line: number;
  column: number;
  constructor(message: string, line: number, column: number) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let column = 1;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === '\n') {
      line++;
      column = 1;
      i++;
      continue;
    }

    if (/\s/.test(char)) {
      column++;
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', line, column });
      column++;
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', line, column });
      column++;
      i++;
      continue;
    }

    if (char === '"') {
      const startLine = line;
      const startCol = column;
      let str = '';
      i++;
      column++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\n') {
            line++;
            column = 1;
        } else {
            column++;
        }
        str += input[i];
        i++;
      }
      if (i >= input.length) {
        throw new ParseError('Unterminated string literal', startLine, startCol);
      }
      tokens.push({ type: 'STRING', value: str, line: startLine, column: startCol });
      i++;
      column++;
      continue;
    }

    if (char === '[') {
      tokens.push({ type: 'LPAREN', value: '[', line, column });
      column++;
      i++;
      continue;
    }

    if (char === ']') {
      tokens.push({ type: 'RPAREN', value: ']', line, column });
      column++;
      i++;
      continue;
    }

    // Number, Keyword, Symbol
    const startCol = column;
    let val = '';
    while (i < input.length && !/[\s()[\]]/.test(input[i])) {
      val += input[i];
      i++;
      column++;
    }

    if (val.startsWith(':')) {
      tokens.push({ type: 'KEYWORD', value: val.slice(1), line, column: startCol });
    } else if (!isNaN(Number(val))) {
      tokens.push({ type: 'NUMBER', value: val, line, column: startCol });
    } else {
      tokens.push({ type: 'SYMBOL', value: val, line, column: startCol });
    }
  }

  return tokens;
}

export function parseGFL(input: string): ASTNode {
  const tokens = tokenize(input);
  let current = 0;

  function parseNode(): ASTNode {
    if (current >= tokens.length) {
      throw new ParseError('Unexpected end of input', -1, -1);
    }

    const token = tokens[current];

    if (token.type !== 'LPAREN') {
      throw new ParseError(`Expected '(', got '${token.value}'`, token.line, token.column);
    }
    current++; // Skip LPAREN

    if (current >= tokens.length) {
      throw new ParseError('Unexpected end of input after "("', token.line, token.column);
    }

    const typeToken = tokens[current];
    if (typeToken.type !== 'SYMBOL') {
      throw new ParseError(`Expected node type (SYMBOL), got '${typeToken.value}'`, typeToken.line, typeToken.column);
    }
    const nodeType = typeToken.value;
    current++;

    const node: ASTNode = {
      type: nodeType,
      children: [],
      params: {},
      cost: 0,
    };

    while (current < tokens.length && tokens[current].type !== 'RPAREN') {
      const nextToken = tokens[current];

      if (nextToken.type === 'KEYWORD') {
        const paramName = nextToken.value;
        current++; // Skip KEYWORD

        if (current >= tokens.length || tokens[current].type === 'RPAREN') {
          throw new ParseError(`Expected value for parameter ':${paramName}'`, nextToken.line, nextToken.column);
        }

        const valueToken = tokens[current];
        if (valueToken.type === 'NUMBER') {
          node.params[paramName] = Number(valueToken.value);
          current++;
        } else if (valueToken.type === 'STRING') {
          node.params[paramName] = valueToken.value;
          current++;
        } else if (valueToken.type === 'SYMBOL') {
           node.params[paramName] = valueToken.value;
           current++;
        } else if (valueToken.type === 'LPAREN') {
          // If value is a list (like an array [1 2 3]), process it as such
          // No, wait, current is pointing to valueToken right now.
          let arr = [];
          current++; // Skip LPAREN
          let isNestedNode = false;
          if (current < tokens.length && tokens[current].type === 'SYMBOL') {
              isNestedNode = true;
          }
          
          if (isNestedNode && valueToken.value === '(') {
             current--; // go back to LPAREN
             node.params[paramName] = parseNode();
          } else {
             // array
             while (current < tokens.length && tokens[current].type !== 'RPAREN') {
                if (tokens[current].type === 'NUMBER') {
                   arr.push(Number(tokens[current].value));
                } else if (tokens[current].type === 'STRING' || tokens[current].type === 'SYMBOL') {
                   arr.push(tokens[current].value);
                } else {
                   throw new ParseError(`Unexpected token in array parameter: ${tokens[current].value}`, tokens[current].line, tokens[current].column);
                }
                current++;
             }
             if (current >= tokens.length || tokens[current].type !== 'RPAREN') {
                 throw new ParseError(`Unterminated array parameter`, valueToken.line, valueToken.column);
             }
             current++; // Skip RPAREN
             node.params[paramName] = arr;
          }
        } else {
          throw new ParseError(`Unexpected token '${valueToken.value}' for parameter ':${paramName}'`, valueToken.line, valueToken.column);
        }
      } else if (nextToken.type === 'LPAREN') {
        // Child node
        node.children.push(parseNode());
      } else if (nextToken.type === 'NUMBER' || nextToken.type === 'STRING' || nextToken.type === 'SYMBOL') {
        // Positional parameter - we'll just store them in an array named 'positional' or similar, 
        // or just append to a list. Or maybe they are part of children? 
        // Let's just put them in a positional params array in params.
        if (!node.params._positional) {
            node.params._positional = [];
        }
        if (nextToken.type === 'NUMBER') {
            node.params._positional.push(Number(nextToken.value));
        } else {
            node.params._positional.push(nextToken.value);
        }
        current++;
      } else {
        throw new ParseError(`Unexpected token '${nextToken.value}'`, nextToken.line, nextToken.column);
      }
    }

    if (current >= tokens.length || tokens[current].type !== 'RPAREN') {
      throw new ParseError(`Unterminated node '${nodeType}'`, typeToken.line, typeToken.column);
    }
    current++; // Skip RPAREN

    // Cost model estimation stub (we can do a simple +1 per node)
    node.cost = 1 + node.children.reduce((acc, c) => acc + c.cost, 0);

    return node;
  }

  const result = parseNode();

  if (current < tokens.length) {
      throw new ParseError(`Unexpected token '${tokens[current].value}' after root node`, tokens[current].line, tokens[current].column);
  }

  return result;
}

export function serializeGFL(node: ASTNode): string {
  return JSON.stringify(node, null, 2);
}

export function deserializeGFL(json: string): ASTNode {
  return JSON.parse(json) as ASTNode;
}
