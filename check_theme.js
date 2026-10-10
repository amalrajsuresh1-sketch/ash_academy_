const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('1. tab-all-btn:', html.includes('tab-all-btn'));
console.log('2. section-rep-performance bg-white:', html.includes('id="section-rep-performance" class="bg-white'));
console.log('3. bg-amber-50 top performer badge:', html.includes('bg-amber-50 text-amber-800'));
console.log('4. Clean border styling:', html.includes('border border-slate-200'));
