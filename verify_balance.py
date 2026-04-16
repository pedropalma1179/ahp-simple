import codecs
import re

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Find the start of the return statement
start_line = -1
for i, line in enumerate(lines):
    if line.strip().startswith('return ('):
        start_line = i
        break

if start_line == -1:
    print("Could not find return statement")
    exit(1)

content = "".join(lines[start_line:])

# Count basic braces
open_braces = content.count('{')
close_braces = content.count('}')
open_parens = content.count('(')
close_parens = content.count(')')
open_divs = content.count('<div')
close_divs = content.count('</div>')

print(f"Start check from line {start_line+1}")
print(f"{{: {open_braces}, }}: {close_braces}, Diff: {open_braces - close_braces}")
print(f"(: {open_parens}, ): {close_parens}, Diff: {open_parens - close_parens}")
print(f"<div: {open_divs}, </div>: {close_divs}, Diff: {open_divs - close_divs}")

# Check for stack balance roughly
stack = []
for i, char in enumerate(content):
    if char == '{':
        stack.append(('{', i))
    elif char == '}':
        if not stack or stack[-1][0] != '{':
            print(f"Unmatched }} at char {i}")
        else:
            stack.pop()
    elif char == '(':
        stack.append(('(', i))
    elif char == ')':
        if not stack or stack[-1][0] != '(':
            print(f"Unmatched ) at char {i}")
        else:
            stack.pop()

if stack:
    print(f"Unclosed items: {stack[:5]} ... ({len(stack)} total)")

# Check explicit div tags for mismatch
div_stack = 0
for i in range(len(content)):
    if content[i:i+4] == '<div':
        div_stack += 1
    elif content[i:i+6] == '</div>':
        div_stack -= 1
        if div_stack < 0:
            print(f"Excess </div> at char {i}")

print(f"Final div stack: {div_stack}")
