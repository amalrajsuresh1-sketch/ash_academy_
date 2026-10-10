const fs = require('fs');
const apiData = JSON.parse(fs.readFileSync('api_sample.json'));

function processApiData(rawData) {
  const allRows = [];
  const sheets = rawData.sheets || {};

  Object.entries(sheets).forEach(([sheetTabName, sheetObj]) => {
    let repName = sheetTabName.trim();
    if (/^hashir/i.test(repName)) {
      repName = 'HASHIR';
    }

    const rows = sheetObj.data || [];
    rows.forEach(r => {
      let rawDate = '', rawNum = '', rawCallStatus = '', rawLeadStatus = '', rawDemo = '';
      
      Object.keys(r).forEach(k => {
        const kl = k.trim().toLowerCase();
        const val = r[k] !== null && r[k] !== undefined ? String(r[k]).trim() : '';
        
        if (kl.includes('date')) rawDate = val;
        else if (kl.includes('number') || kl.includes('mobile')) rawNum = val;
        else if (kl.includes('call status') || kl.includes('callstatus')) rawCallStatus = val;
        else if (kl.includes('lead status') || kl.includes('leadstatus')) rawLeadStatus = val;
        else if (kl.includes('demo')) rawDemo = val;
      });

      if (!rawNum) return; // Ignore blank mobile numbers

      let parsedDateStr = '';
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          parsedDateStr = d.toISOString().split('T')[0];
        }
      }

      let normCallStatus = rawCallStatus.toUpperCase();
      let callCategory = 'OTHER';
      if (normCallStatus === 'CONNECTED') callCategory = 'CONNECTED';
      else if (normCallStatus === 'CONNECTED ON WHATSAPP' || normCallStatus === 'CONNECTED ON WTSP') callCategory = 'CONNECTED ON WHATSAPP';
      else if (normCallStatus === 'DNP') callCategory = 'DNP';
      else if (normCallStatus === 'DNP2' || normCallStatus === 'DNP 2') callCategory = 'DNP 2';
      else if (normCallStatus === 'DNP3' || normCallStatus === 'DNP 3') callCategory = 'DNP 3';
      else if (normCallStatus === 'NO RESPONSE') callCategory = 'NO RESPONSE';
      else if (normCallStatus.includes('INVALID') || normCallStatus.includes('NOT AVAILABLE') || normCallStatus.includes('INVALI')) callCategory = 'INVALID/NOT AVAILABLE';
      else if (normCallStatus === 'BUSY') callCategory = 'BUSY';

      let normLeadStatus = rawLeadStatus.toUpperCase();
      let leadCategory = 'OTHER';
      if (normLeadStatus.includes('FOLLOW')) leadCategory = 'FOLLOWUP';
      else if (normLeadStatus.includes('CONVERT')) leadCategory = 'CONVERTED';

      let normDemo = rawDemo.toUpperCase();
      let demoCategory = 'OTHER';
      if (normDemo.includes('SCHEDULED')) demoCategory = 'SCHEDULED';
      else if (normDemo.includes('DEMO') || normDemo.includes('VISIT')) demoCategory = 'DEMO DONE';

      allRows.push({
        rep: repName,
        originalSheet: sheetTabName,
        date: parsedDateStr,
        mobile: rawNum,
        callStatus: callCategory,
        leadStatus: leadCategory,
        demo: demoCategory
      });
    });
  });

  return allRows;
}

const processed = processApiData(apiData);
console.log('Total processed valid rows:', processed.length);

const reps = Array.from(new Set(processed.map(r => r.rep)));
console.log('Normalized Reps:', reps);

reps.forEach(rep => {
  const repRows = processed.filter(r => r.rep === rep);
  const totalLeads = new Set(repRows.map(r => r.mobile)).size;
  const connectedCalls = new Set(repRows.filter(r => r.callStatus === 'CONNECTED' || r.callStatus === 'CONNECTED ON WHATSAPP').map(r => r.mobile)).size;
  const followup = new Set(repRows.filter(r => r.leadStatus === 'FOLLOWUP').map(r => r.mobile)).size;
  const demoScheduled = new Set(repRows.filter(r => r.demo === 'SCHEDULED').map(r => r.mobile)).size;
  const demoDone = new Set(repRows.filter(r => r.demo === 'DEMO DONE').map(r => r.mobile)).size;
  const converted = new Set(repRows.filter(r => r.leadStatus === 'CONVERTED').map(r => r.mobile)).size;

  console.log('\nRep:', rep);
  console.log('  Total Leads (Distinct):', totalLeads);
  console.log('  Connected Calls:', connectedCalls);
  console.log('  Followup Calls:', followup);
  console.log('  Demo Scheduled:', demoScheduled);
  console.log('  Demo Done:', demoDone);
  console.log('  Converted:', converted);
});
