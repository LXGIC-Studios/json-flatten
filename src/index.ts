#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// ─── Flatten ───

function flatten(
  obj: JsonValue,
  delimiter: string = '.',
  prefix: string = '',
  result: Record<string, JsonValue> = {}
): Record<string, JsonValue> {
  if (obj === null || typeof obj !== 'object') {
    result[prefix] = obj;
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[prefix] = [];
      return result;
    }
    for (let i = 0; i < obj.length; i++) {
      const key = prefix ? `${prefix}${delimiter}${i}` : `${i}`;
      flatten(obj[i], delimiter, key, result);
    }
    return result;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) {
    result[prefix] = {};
    return result;
  }

  for (const key of keys) {
    const newPrefix = prefix ? `${prefix}${delimiter}${key}` : key;
    flatten(obj[key], delimiter, newPrefix, result);
  }

  return result;
}

// ─── Unflatten ───

function unflatten(obj: Record<string, JsonValue>, delimiter: string = '.'): JsonValue {
  const result: any = {};

  for (const [flatKey, value] of Object.entries(obj)) {
    const keys = splitKey(flatKey, delimiter);
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      const isNextNumeric = /^\d+$/.test(nextKey);

      if (current[key] === undefined) {
        current[key] = isNextNumeric ? [] : {};
      }

      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  // Convert root to array if all keys are numeric
  return maybeConvertToArray(result);
}

function splitKey(key: string, delimiter: string): string[] {
  if (delimiter === '.') {
    return key.split('.');
  }
  return key.split(delimiter);
}

function maybeConvertToArray(obj: any): any {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;

  const keys = Object.keys(obj);
  const allNumeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k));

  if (allNumeric) {
    const arr: any[] = [];
    for (const k of keys) {
      arr[parseInt(k)] = maybeConvertToArray(obj[k]);
    }
    return arr;
  }

  for (const k of keys) {
    obj[k] = maybeConvertToArray(obj[k]);
  }

  return obj;
}

// ─── Filtering ───

function filterByPath(flat: Record<string, JsonValue>, pattern: string): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};

  // Support glob-like patterns
  const regex = new RegExp(
    '^' +
    pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^.]*')
      .replace(/\*\*/g, '.*')
    + '$'
  );

  for (const [key, value] of Object.entries(flat)) {
    if (regex.test(key)) {
      result[key] = value;
    }
  }

  return result;
}

// ─── Display ───

function formatValue(value: JsonValue): string {
  if (value === null) return `${c.dim}null${c.reset}`;
  if (typeof value === 'string') return `${c.green}"${value}"${c.reset}`;
  if (typeof value === 'number') return `${c.yellow}${value}${c.reset}`;
  if (typeof value === 'boolean') return `${c.magenta}${value}${c.reset}`;
  if (Array.isArray(value)) return `${c.dim}[]${c.reset}`;
  if (typeof value === 'object') return `${c.dim}{}${c.reset}`;
  return String(value);
}

function printFlat(flat: Record<string, JsonValue>, colorize: boolean): void {
  for (const [key, value] of Object.entries(flat)) {
    if (colorize) {
      console.log(`${c.cyan}${key}${c.reset} = ${formatValue(value)}`);
    } else {
      const displayValue = typeof value === 'string' ? `"${value}"` : String(value);
      console.log(`${key} = ${displayValue}`);
    }
  }
}

// ─── Stats ───

interface FlatStats {
  totalKeys: number;
  maxDepth: number;
  types: Record<string, number>;
}

function getStats(flat: Record<string, JsonValue>, delimiter: string): FlatStats {
  const types: Record<string, number> = {};
  let maxDepth = 0;

  for (const [key, value] of Object.entries(flat)) {
    const depth = key.split(delimiter).length;
    if (depth > maxDepth) maxDepth = depth;

    const type = value === null ? 'null' : typeof value;
    types[type] = (types[type] || 0) + 1;
  }

  return {
    totalKeys: Object.keys(flat).length,
    maxDepth,
    types,
  };
}

// ─── CLI ───

function printHelp(): void {
  console.log(`
${c.bgBlue}${c.white}${c.bold} json-flatten ${c.reset} ${c.dim}v1.0.0${c.reset}

${c.bold}Flatten nested JSON to dot-notation key-value pairs${c.reset}

${c.yellow}USAGE${c.reset}
  ${c.cyan}json-flatten${c.reset} [options] [file]
  ${c.cyan}cat data.json | json-flatten${c.reset}

${c.yellow}OPTIONS${c.reset}
  ${c.green}-f, --file${c.reset} <path>         Input JSON file
  ${c.green}-u, --unflatten${c.reset}            Unflatten (reverse operation)
  ${c.green}-d, --delimiter${c.reset} <char>     Key separator (default: .)
  ${c.green}--filter${c.reset} <pattern>         Filter paths by pattern (supports * and **)
  ${c.green}--json${c.reset}                     Output as JSON object instead of key=value
  ${c.green}--stats${c.reset}                    Show statistics about flattened data
  ${c.green}--compact${c.reset}                  Compact JSON output
  ${c.green}--keys-only${c.reset}                Print only keys
  ${c.green}--values-only${c.reset}              Print only values
  ${c.green}--count${c.reset}                    Print number of keys
  ${c.green}--help${c.reset}                     Show this help
  ${c.green}--version${c.reset}                  Show version

${c.yellow}EXAMPLES${c.reset}
  ${c.dim}# Flatten JSON file${c.reset}
  json-flatten data.json

  ${c.dim}# From stdin${c.reset}
  echo '{"user":{"name":"John","address":{"city":"NYC"}}}' | json-flatten

  ${c.dim}# Unflatten back${c.reset}
  echo '{"user.name":"John","user.city":"NYC"}' | json-flatten --unflatten

  ${c.dim}# Custom delimiter${c.reset}
  json-flatten -d '/' data.json

  ${c.dim}# Filter paths${c.reset}
  json-flatten --filter 'user.*' data.json

  ${c.dim}# Deep filter${c.reset}
  json-flatten --filter '**.name' data.json

  ${c.dim}# JSON output${c.reset}
  json-flatten --json data.json

  ${c.dim}# Keys only${c.reset}
  json-flatten --keys-only data.json | sort
`);
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('json-flatten v1.0.0');
    process.exit(0);
  }

  let filePath = '';
  let doUnflatten = false;
  let delimiter = '.';
  let filterPattern = '';
  let jsonOutput = false;
  let showStats = false;
  let compact = false;
  let keysOnly = false;
  let valuesOnly = false;
  let countOnly = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-f':
      case '--file':
        filePath = args[++i] || '';
        break;
      case '-u':
      case '--unflatten':
        doUnflatten = true;
        break;
      case '-d':
      case '--delimiter':
        delimiter = args[++i] || '.';
        break;
      case '--filter':
        filterPattern = args[++i] || '';
        break;
      case '--json':
        jsonOutput = true;
        break;
      case '--stats':
        showStats = true;
        break;
      case '--compact':
        compact = true;
        break;
      case '--keys-only':
        keysOnly = true;
        break;
      case '--values-only':
        valuesOnly = true;
        break;
      case '--count':
        countOnly = true;
        break;
      default:
        if (!args[i].startsWith('-') && !filePath) {
          filePath = args[i];
        }
        break;
    }
  }

  // Read input
  let input = '';
  if (filePath) {
    try {
      input = fs.readFileSync(path.resolve(filePath), 'utf8').trim();
    } catch (err: any) {
      console.error(`${c.red}Error:${c.reset} Can't read file: ${filePath}`);
      console.error(err.message);
      process.exit(1);
    }
  } else {
    input = await readStdin();
  }

  if (!input) {
    console.error(`${c.red}Error:${c.reset} No input provided. Use --help for usage.`);
    process.exit(1);
  }

  let parsed: JsonValue;
  try {
    parsed = JSON.parse(input);
  } catch (err: any) {
    console.error(`${c.red}Error:${c.reset} Invalid JSON input`);
    console.error(err.message);
    process.exit(1);
  }

  if (doUnflatten) {
    // Unflatten mode
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.error(`${c.red}Error:${c.reset} Unflatten expects a flat JSON object`);
      process.exit(1);
    }

    const result = unflatten(parsed as Record<string, JsonValue>, delimiter);
    const indent = compact ? 0 : 2;
    console.log(JSON.stringify(result, null, indent));
    return;
  }

  // Flatten mode
  let flat = flatten(parsed, delimiter);

  // Apply filter
  if (filterPattern) {
    flat = filterByPath(flat, filterPattern);
  }

  // Output
  if (countOnly) {
    console.log(Object.keys(flat).length);
    return;
  }

  if (showStats) {
    const stats = getStats(flat, delimiter);
    console.log(`\n${c.bgBlue}${c.white}${c.bold} Statistics ${c.reset}\n`);
    console.log(`  ${c.bold}Total Keys:${c.reset}  ${stats.totalKeys}`);
    console.log(`  ${c.bold}Max Depth:${c.reset}   ${stats.maxDepth}`);
    console.log(`  ${c.bold}Types:${c.reset}`);
    for (const [type, count] of Object.entries(stats.types)) {
      console.log(`    ${c.cyan}${type}${c.reset}: ${count}`);
    }
    console.log();
  }

  if (keysOnly) {
    for (const key of Object.keys(flat)) {
      console.log(key);
    }
    return;
  }

  if (valuesOnly) {
    for (const value of Object.values(flat)) {
      console.log(typeof value === 'string' ? value : JSON.stringify(value));
    }
    return;
  }

  if (jsonOutput) {
    const indent = compact ? 0 : 2;
    console.log(JSON.stringify(flat, null, indent));
  } else {
    const colorize = process.stdout.isTTY;
    printFlat(flat, colorize);
  }
}

main().catch((err) => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});
