import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 1300
truncated_lines = lines[:1300]

# Append debug return
suffix = """
  // Debug inserted at 1300
  return <div>DEBUG 1300</div>;
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(truncated_lines)
    f.write(suffix)

print("Truncated at 1300.")
