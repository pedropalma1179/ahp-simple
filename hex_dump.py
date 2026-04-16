import codecs
import binascii

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

print("Hex dump lines 1110-1120:")
for i in range(1110, 1120):
    if i < len(lines):
        line = lines[i]
        print(f"{i+1}: {binascii.hexlify(line.encode('utf-8'))}")
