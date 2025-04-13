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
const HEADERS = 'date,payee,categoryName,amount,memo,checknum,type,accountId,id,originalPayee,originalMemo';

const ACCOUNTTYPE = {
   BANK: 'Checking',
   CREDITCARD: 'CreditCard'
};
Object.freeze(ACCOUNTTYPE);

const parseOfxDate = ((ofxDate) => {
   // Chase: 20221003120000[0:GMT]      will be converted as is
   // Amex:  20221001000000.000[-7:MST] will be converted as noon and without timezone
   const d = ofxDate.slice(0, ofxDate.indexOf('['));
   const z = parseInt(ofxDate.slice(ofxDate.indexOf('[')+1, ofxDate.indexOf(':')), 10);
   let date = dayjs.utc(d);
   //if (z != 0) { date = date.set('hour', 12) } // HACK for Amex
   return date.format('YYYY-MM-DD') + "T12:00:00.000Z";
});

const computePayee = ((ofxPayee) => {
   var payee = ofxPayee ? ofxPayee.trim() : ' ';
   payee = payee.replace(/,/g, '');
   payee = payee.replace(/\t/g, '');

   var newPayee = payee;
   return newPayee.trim();
});

const computeMemo = ((accountType, payee, ofxMemo) => {
   var memo = ofxMemo ? ofxMemo.trim() : ' ';
   memo = memo.replace(/,/g, '');
   memo = memo.replace(/\t/g, '');

   var newMemo = memo;
   if (accountType === ACCOUNTTYPE.BANK) {
      // check: payee
      // debit,credit: payee + memo
      newMemo = payee + ' ' + memo;
   }
   return newMemo.trim();
});

(async () => {

   const mappings = JSON.parse(fs.readFileSync(MAPPINGSFILE).toString());
   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});
   const databaseIds = database.filter(i => i.id !== null && i.id.trim() !== '').map(i => i.id);
   var skippedCount = 0;
   var importedCount = 0;

   // process qfx files
   for (const file of fs.readdirSync(DOWNLOADSFOLDER)) {
      if (!file.toLowerCase().endsWith('.qfx')) {
         //console.log(`SKIPPING: ${file}`);
         continue;
      }

      // read ofx file
      console.log(`PROCESSING: ${file}`)
      const ofxFile = path.join(DOWNLOADSFOLDER, file);
      const ofxData = await parseOFX(fs.readFileSync(ofxFile).toString());
      const accountType = ofxData.OFX.BANKMSGSRSV1 ? ACCOUNTTYPE.BANK : ACCOUNTTYPE.CREDITCARD;
      const statement = accountType === ACCOUNTTYPE.BANK ? ofxData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS : ofxData.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS;
      const accountId = accountType === ACCOUNTTYPE.BANK ? statement.BANKACCTFROM.ACCTID : statement.CCACCTFROM.ACCTID;
      const ofxTransactions = statement.BANKTRANLIST.STMTTRN;

      // process transactions
      for (const ofxTransaction of ofxTransactions) {
         // NOTE: property names must match databaseColumns names
         const newPayee = computePayee(ofxTransaction.NAME);
         const newMemo = computeMemo(accountType, newPayee, ofxTransaction.MEMO);
         const transaction = {
            date: parseOfxDate(ofxTransaction.DTPOSTED), //.format('YYYY-MM-DD') + "T12:00:00.000Z",
            payee: newPayee,
            categoryName: 'UNKNOWN',
            amount: ofxTransaction.TRNAMT,
            memo: newMemo,
            checknum: ofxTransaction.CHECKNUM || '',
            type: ofxTransaction.TRNTYPE,
            accountId: accountId,
            id: ofxTransaction.FITID,
            originalPayee: ofxTransaction.NAME,
            originalMemo: ofxTransaction.MEMO || ''
         };

         // if it exists, skip it
         if (databaseIds.includes(transaction.id)) {
            //console.log(`   SKIPPED: ${transaction.date}, ${transaction.payee}, ${transaction.amount}, ${transaction.id}`);
            skippedCount++;
            continue;
         }

         // remap payee and categoryName
         mappings.find(mapping => {
            const re = new RegExp(mapping.ofxPattern);
            const text = transaction.originalPayee + " " + transaction.amount
            if (re.test(text)) {
               transaction.payee = mapping.newPayee;
               transaction.categoryName = mapping.newCategoryName;
            }
         });
         if (transaction.categoryName === 'UNKNOWN') {
            transaction.payee = transaction.payee.toUpperCase();
         }

         // save it
         console.log(`   IMPORTED: ${transaction.date}, ${transaction.payee}, ${transaction.categoryName}, ${transaction.amount}, ${transaction.memo}, ${transaction.checknum}, ${transaction.accountId}`);
         database.push(transaction);
         importedCount++;
      }
   }

   // update database
   database.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
   const databaseData = HEADERS + csvjson.toCSV(database, {delimiter: ',', headers: 'none'}) + '\n';
   fs.writeFileSync(DATABASEFILE, databaseData);
   console.log(`\nCOMPLETED: ${importedCount} imported, ${skippedCount} skipped`);

   // backup database
   fs.copyFileSync(DATABASEFILE, DATABASEBAKFILE);

})();
