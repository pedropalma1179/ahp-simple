import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 580
truncated_lines = lines[:580]

# Append debug return
suffix = """
  // Debug inserted
  console.log(qualityRespondentsData); // Use the variable to avoid unused var error
  return <div>DEBUG 580</div>;
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(truncated_lines)
    f.write(suffix)

print("Truncated at 580.")
