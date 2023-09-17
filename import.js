import {parse as parseOFX} from 'ofx-js';
import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

const DOWNLOADSFOLDER = path.join(os.homedir(), 'Downloads');
const MAPPINGSFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transaction-mappings.json');
const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const DATABASEBAKFOLDER = path.join(os.homedir(), 'Temp');
const DATABASEBAKFILE = path.join(DATABASEBAKFOLDER, `transactions-${Date.now().toString()}.bak`);
const HEADERS = 'date,payee,category,amount,notes,checknum,institution,type,id';

const ACCOUNTTYPE = {
   BANK: 'Checking',
   CREDITCARD: 'Credit Card'
};
Object.freeze(ACCOUNTTYPE);

const parseOfxDate = ((ofxDate) => {
   // 20221003120000[0:GMT]    20221001000000.000[-7:MST]
   const d = ofxDate.slice(0, ofxDate.indexOf('['));
   const z = ofxDate.slice(ofxDate.indexOf('[')+1, ofxDate.indexOf(':'));
   const date = dayjs.utc(d).utcOffset(z);
   return date;
});

const computeInstitution = ((org) => {
   switch (org.toString().toUpperCase()) {
      case 'B1': return 'CHASE';
      default: return org;
   }
});

const computeDefaultCategory = ((type) => {
   return type === 'CREDIT' ? 'Income' : 'Misc Expense';
});

const computeMemo = ((accountType, payee, memo) => {
   if (accountType === ACCOUNTTYPE.BANK) {
      if (!memo) {
         // check: payee
         return payee;
      } else {
         // debit,credit: payee + memo
         return payee + ' ' + memo;
      }
   } else {
      return memo || ' ';
   }
});

(async () => {

   const mappings = JSON.parse(fs.readFileSync(MAPPINGSFILE).toString());
   const mappingKeys = Object.keys(mappings);

   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});
   const databaseIds = database.filter(i => i.id !== null && i.id.trim() !== '').map(i => i.id);

   for (const file of fs.readdirSync(DOWNLOADSFOLDER)) {
      if (!file.toLowerCase().endsWith('.qfx') || file.toLowerCase().includes('patched')) {
         console.log(`SKIPPING: ${file}`);
         continue;
      }

      // read ofx file
      const ofxFile = path.join(DOWNLOADSFOLDER, file);
      const ofxData = await parseOFX(fs.readFileSync(ofxFile).toString());
      const institution = computeInstitution(ofxData.OFX.SIGNONMSGSRSV1.SONRS.FI.ORG);
      const accountType = ofxData.OFX.BANKMSGSRSV1 ? ACCOUNTTYPE.BANK : ACCOUNTTYPE.CREDITCARD;
      const statement = accountType === ACCOUNTTYPE.BANK ? ofxData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS : ofxData.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS;
      const accountId = accountType === ACCOUNTTYPE.BANK ? statement.BANKACCTFROM.ACCTID : statement.CCACCTFROM.ACCTID;
      const dateStart = parseOfxDate(statement.BANKTRANLIST.DTSTART);
      const dateEnd = parseOfxDate(statement.BANKTRANLIST.DTEND);
      const ofxTransactions = statement.BANKTRANLIST.STMTTRN;

      // process transactions
      const transactions = [];
      for (const ofxTransaction of ofxTransactions) {
         // NOTE: property names must match databaseColumns names
         const transaction = {
            date: parseOfxDate(ofxTransaction.DTPOSTED).format('YYYY-MM-DD'),
            payee: ofxTransaction.NAME,
            category: computeDefaultCategory(ofxTransaction.TRNTYPE),
            amount: ofxTransaction.TRNAMT,
            notes: computeMemo(accountType, ofxTransaction.NAME, ofxTransaction.MEMO),
            checknum: ofxTransaction.CHECKNUM || '',
            institution: institution,
            type: ofxTransaction.TRNTYPE,
            id: ofxTransaction.FITID
         };

         // if it exists, skip it
         if (databaseIds.includes(transaction.id)) {
            console.log(`SKIPPED: ${transaction.date}, ${transaction.payee}, ${transaction.amount}, ${transaction.id}`);
            continue;
         }

         // remap payee and category
         mappingKeys.find(mappingKey => {
            const re = new RegExp(mappingKey);
            if (re.test(transaction.payee) || re.test(transaction.notes)) {
               transaction.payee = mappings[mappingKey].payee;
               transaction.category = mappings[mappingKey].category;
            }
         });
         if (transaction.category === 'Misc Expense') {
            transaction.payee = transaction.payee.toUpperCase();
         }

         // save it
         console.log(`IMPORTED: ${transaction.date}, ${transaction.payee}, ${transaction.category}, ${transaction.amount}, ${transaction.notes}, ${transaction.checknum}, ${transaction.institution}`);
         database.push(transaction);
      }
   }

   // update database
   fs.copyFileSync(DATABASEFILE, DATABASEBAKFILE);
   database.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
   const databaseData = HEADERS + csvjson.toCSV(database, {delimiter: ',', headers: 'none'}) + '\n';
   fs.writeFileSync(DATABASEFILE, databaseData);

})();
