import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

start_line = 0
for i, line in enumerate(lines):
    if i > 2000 and line.strip().startswith('return ('):
        start_line = i
        break

print(f"Analyzing return block starting at line {start_line+1}")

content = "".join(lines[start_line:])

stack = []
for idx, char in enumerate(content):
    if char == '{':
        stack.append(idx)
    elif char == '}':
        if not stack:
            print(f"FOUND UNMATCHED }} at file line {start_line + content[:idx].count(chr(10)) + 1}")
            # Print context
            start_context = max(0, idx - 100)
            end_context = min(len(content), idx + 100)
            print("CONTEXT:")
            print(content[start_context:end_context])
            break
        else:
            stack.pop()

if stack:
    print(f"Found {len(stack)} unclosed {{ braces.")
    first_unclosed = stack[0]
    print(f"First unclosed {{ at line {start_line + content[:first_unclosed].count(chr(10)) + 1}")
    print("CONTEXT:")
    print(content[first_unclosed:first_unclosed+100])
