import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

start_line = -1
end_line = -1

for i, line in enumerate(lines):
    if "activeTab === 'bibliography'" in line and "&&" in line:
        start_line = i
    if start_line != -1 and i > start_line + 5 and line.strip() == ')}':
        end_line = i
        break

if start_line == -1 or end_line == -1:
    print("Could not find bibliography block.")
    exit(1)

# Keep start line
# Keep end line
# Replace middle with empty div
new_lines = lines[:start_line+1]
new_lines.append('            <div className="p-10 text-center">Bibliography placeholder</div>\n')
new_lines.extend(lines[end_line:])

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(new_lines)

print("Bibliography content removed.")
