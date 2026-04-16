import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 533 (0-indexed 533 is line 534)
# We want to keep lines 0 to 533 inclusive
truncated_lines = lines[:533]

# Append debug return
suffix = """
  // Debug inserted
  return <div>DEBUG 533</div>;
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(truncated_lines)
    f.write(suffix)

print("Truncated at 533.")
