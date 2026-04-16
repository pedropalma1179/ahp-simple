import shutil
import os

backup = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx.bak'
dest = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

if os.path.exists(backup):
    shutil.copy2(backup, dest)
    print(f'Restored size: {os.path.getsize(dest)}')
else:
    print('Backup file not found!')
