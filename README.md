# json-flatten

[![npm version](https://img.shields.io/npm/v/@lxgicstudios/json-flatten.svg)](https://www.npmjs.com/package/@lxgicstudios/json-flatten)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Flatten nested JSON to dot-notation key-value pairs. Also unflatten back to nested structures. Supports custom delimiters, path filtering, and plays nice with pipes.

## Install

```bash
npm install -g @lxgicstudios/json-flatten
```

Or run directly:

```bash
npx @lxgicstudios/json-flatten data.json
```

## Features

- **Flatten** - Nested JSON to flat dot-notation pairs
- **Unflatten** - Reverse operation, back to nested
- **Custom delimiters** - Use `/`, `_`, or whatever you want
- **Path filtering** - Match paths with `*` and `**` wildcards
- **Keys only / Values only** - Extract just what you need
- **Stats mode** - Count keys, max depth, type breakdown
- **Pipe-friendly** - Reads stdin, writes stdout
- **JSON output** - Get the flat object as JSON
- **Colorized display** - Pretty key=value output in terminal
- **Zero dependencies** - Built with Node.js builtins only

## Usage

```bash
# Flatten a JSON file
json-flatten data.json

# From stdin
echo '{"user":{"name":"John","address":{"city":"NYC"}}}' | json-flatten
# Output:
# user.name = "John"
# user.address.city = "NYC"

# Unflatten back
echo '{"user.name":"John","user.address.city":"NYC"}' | json-flatten --unflatten

# Custom delimiter
json-flatten -d '/' data.json
# Output: user/name = "John"

# Filter paths
json-flatten --filter 'user.*' data.json

# Deep wildcard filter
json-flatten --filter '**.name' data.json

# JSON output
json-flatten --json data.json

# Keys only (great for piping to sort, grep, etc)
json-flatten --keys-only data.json | sort

# Count total keys
json-flatten --count data.json

# Stats
json-flatten --stats data.json
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Input JSON file | - |
| `-u, --unflatten` | Unflatten (reverse operation) | `false` |
| `-d, --delimiter <char>` | Key separator | `.` |
| `--filter <pattern>` | Filter by path pattern (`*`, `**`) | - |
| `--json` | Output as JSON object | `false` |
| `--stats` | Show statistics | `false` |
| `--compact` | Compact JSON output | `false` |
| `--keys-only` | Print only keys | `false` |
| `--values-only` | Print only values | `false` |
| `--count` | Print number of keys | `false` |
| `--help` | Show help | - |

## Example

Input (`data.json`):
```json
{
  "user": {
    "name": "Jane",
    "age": 28,
    "address": {
      "street": "123 Main St",
      "city": "Portland"
    },
    "tags": ["dev", "admin"]
  }
}
```

Flattened output:
```
user.name = "Jane"
user.age = 28
user.address.street = "123 Main St"
user.address.city = "Portland"
user.tags.0 = "dev"
user.tags.1 = "admin"
```

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

[GitHub](https://github.com/lxgicstudios/json-flatten) | [Twitter](https://x.com/lxgicstudios)
