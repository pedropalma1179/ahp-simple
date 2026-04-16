import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

start_line = 0
for i, line in enumerate(lines):
    if line.strip().startswith('return ('):
        start_line = i
        break

content = "".join(lines[start_line:])
target_char = 5199 # From previous run

current_char = 0
found = False
for i, line in enumerate(lines[start_line:]):
    line_len = len(line)
    # Check if target is in this line
    # Note: verify_balance.py used simple enumeration, confusing if it counts \r\n correctly.
    # But usually Python handles newlines in len().
    
    # We will search for the unmatched } by running the stack logic again to be precision
    pass

# Precise search
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
            found = True
            break
        else:
            stack.pop()

if not found:
    print("Could not reproduce match error with this logic.")
