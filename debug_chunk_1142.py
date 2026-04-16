import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 1142
truncated_lines = lines[:1142]
content = "".join(truncated_lines)

# Count braces
open_braces = content.count('{')
close_braces = content.count('}')
diff = open_braces - close_braces

print(f"Diff at line 1142: {diff}")

# Create closing suffix
suffix = "}\n" * diff
suffix += """
  return <div>DEBUG 1142</div>;
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(truncated_lines)
    f.write(suffix)

print("Truncated at 1142 with auto-balance.")
