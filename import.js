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
const DATABASEBAKFOLDER = path.join(os.homedir(), 'Documents', 'Backups', 'transaction-manager');
const DATABASEBAKFILE = path.join(DATABASEBAKFOLDER, `transactions-backup-${Date.now().toString()}.csv`);
const HEADERS = 'date,payee,category,amount,memo,checknum,type,accountId,id,originalPayee,originalMemo';

const ACCOUNTTYPE = {
   BANK: 'Checking',
   CREDITCARD: 'CreditCard'
};
Object.freeze(ACCOUNTTYPE);

const parseOfxDate = ((ofxDate) => {
   // Chase: 20221003120000[0:GMT] will be converted correctly
   // Amex: 20221001000000.000[-7:MST] will be converted without timezone, ie just date
   const d = ofxDate.slice(0, ofxDate.indexOf('['));
   const z = ofxDate.slice(ofxDate.indexOf('[')+1, ofxDate.indexOf(':'));
   const date = dayjs.utc(d);//.utcOffset(parseInt(z, 10));
   return date;
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
   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});
   const databaseIds = database.filter(i => i.id !== null && i.id.trim() !== '').map(i => i.id);
   var skippedCount = 0;
   var importedCount = 0;

   // backup database
   fs.copyFileSync(DATABASEFILE, DATABASEBAKFILE);

   // process qfx files
   for (const file of fs.readdirSync(DOWNLOADSFOLDER)) {
      if (!file.toLowerCase().endsWith('.qfx')) {
         console.log(`SKIPPING: ${file}`);
         continue;
      }
      console.log(`PROCESSING: ${file}`)

      // read ofx file
      const ofxFile = path.join(DOWNLOADSFOLDER, file);
      const ofxData = await parseOFX(fs.readFileSync(ofxFile).toString());
      const accountType = ofxData.OFX.BANKMSGSRSV1 ? ACCOUNTTYPE.BANK : ACCOUNTTYPE.CREDITCARD;
      const statement = accountType === ACCOUNTTYPE.BANK ? ofxData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS : ofxData.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS;
      const accountId = accountType === ACCOUNTTYPE.BANK ? statement.BANKACCTFROM.ACCTID : statement.CCACCTFROM.ACCTID;
      const ofxTransactions = statement.BANKTRANLIST.STMTTRN;

      // process transactions
      for (const ofxTransaction of ofxTransactions) {
         // NOTE: property names must match databaseColumns names
         const transaction = {
             // Chase: stays the same, ie is already noon
             // Amex: force it to noon which aligns with website/app display and *not* -7:MST offset
            date: parseOfxDate(ofxTransaction.DTPOSTED).format('YYYY-MM-DD') + "T12:00:00.000Z",
            payee: ofxTransaction.NAME,
            category: 'UNKNOWN',
            amount: ofxTransaction.TRNAMT,
            memo: computeMemo(accountType, ofxTransaction.NAME, ofxTransaction.MEMO),
            checknum: ofxTransaction.CHECKNUM || '',
            type: ofxTransaction.TRNTYPE,
            accountId: accountId,
            id: ofxTransaction.FITID,
            originalPayee: ofxTransaction.NAME,
            originalMemo: ofxTransaction.MEMO
         };

         // if it exists, skip it
         if (databaseIds.includes(transaction.id)) {
            console.log(`   SKIPPED: ${transaction.date}, ${transaction.payee}, ${transaction.amount}, ${transaction.id}`);
            skippedCount++;
            continue;
         }

         // remap payee and category
         mappings.find(mapping => {
            const re = new RegExp(mapping.ofxPattern);
            if (re.test(transaction.payee) || re.test(transaction.memo)) {
               transaction.payee = mapping.newPayee;
               transaction.category = mapping.newCategory;
            }
         });
         if (transaction.category === 'UNKNOWN') {
            transaction.payee = transaction.payee.toUpperCase();
         }

         // save it
         console.log(`   IMPORTED: ${transaction.date}, ${transaction.payee}, ${transaction.category}, ${transaction.amount}, ${transaction.memo}, ${transaction.checknum}, ${transaction.accountId}`);
         database.push(transaction);
         importedCount++;
      }
   }

   // update database
   database.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
   const databaseData = HEADERS + csvjson.toCSV(database, {delimiter: ',', headers: 'none'}) + '\n';
   fs.writeFileSync(DATABASEFILE, databaseData);
   console.log(`\nCOMPLETED: ${importedCount} imported, ${skippedCount} skipped`);

})();
