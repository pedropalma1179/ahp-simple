const fs = require('fs');
let c = fs.readFileSync('app/avaliacao/[projectId]/page.tsx', 'utf8');

c = c.replace(/className="text-xs font-medium text-white\/80 truncate"/g, 'className="text-sm font-medium text-white/80 truncate"');
c = c.replace(/<span className={`text-xs \$\{status === 'current'/g, '<span className={`text-sm ${status === \'current\'');
c = c.replace(/<span className={`text-xs font-medium \$\{hasCurrent/g, '<span className={`text-sm font-medium ${hasCurrent');
c = c.replace(/className={`flex items-center gap-2 px-2 py-1 rounded text-xs/g, 'className={`flex items-center gap-2 px-2 py-1 rounded text-sm');

c = c.replace(/<p className="text-xs text-gray-300 leading-relaxed">/g, '<p className="text-sm text-gray-300 leading-relaxed">');
c = c.replace(/<p className="text-xs text-gray-500 leading-relaxed/g, '<p className="text-sm text-gray-500 leading-relaxed');
c = c.replace(/className="text-white\/50 text-xs flex items-center/g, 'className="text-white/50 text-sm flex items-center');
c = c.replace(/className="text-xs text-red-300\/80 mt-1"/g, 'className="text-sm text-red-300/80 mt-1"');
c = c.replace(/className="text-xs sm:text-sm font-medium/g, 'className="text-sm font-medium');
c = c.replace(/className="text-xs text-gray-400"/g, 'className="text-sm text-gray-400"');

fs.writeFileSync('app/avaliacao/[projectId]/page.tsx', c, 'utf8');
console.log('done');
