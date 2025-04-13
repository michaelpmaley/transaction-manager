import {parse as parseOFX} from 'ofx-js';
import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

const DOWNLOADSFOLDER = path.join(os.homedir(), 'Downloads');
const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const DATABASEBAKFOLDER = path.join(os.homedir(), 'Documents', 'Backups', 'transaction-manager');
const DATABASEBAKFILE = path.join(DATABASEBAKFOLDER, `transactions-${Date.now().toString()}.csv`);
const HEADERS = 'date,payee,categoryName,amount,memo,checknum,type,accountId,id,originalPayee,originalMemo';

const ACCOUNTTYPE = {
   BANK: 'Checking',
   CREDITCARD: 'CreditCard'
};
Object.freeze(ACCOUNTTYPE);

(async () => {

   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});
   const databaseIds = database.filter(i => i.id !== null && i.id.trim() !== '').map(i => i.id);
   var skippedCount = 0;
   var backfilledCount = 0;

   // backup database
   fs.copyFileSync(DATABASEFILE, DATABASEBAKFILE);

   // process qfx files
   for (const file of fs.readdirSync(DOWNLOADSFOLDER)) {
      if (!file.toLowerCase().endsWith('.qfx')) {
         //console.log(`SKIPPING: ${file}`);
         continue;
      }
      console.log(`PROCESSING: ${file}`)

      // read ofx file
      const ofxFile = path.join(DOWNLOADSFOLDER, file);
      const ofxData = await parseOFX(fs.readFileSync(ofxFile).toString());
      const accountType = ofxData.OFX.BANKMSGSRSV1 ? ACCOUNTTYPE.BANK : ACCOUNTTYPE.CREDITCARD;
      const statement = accountType === ACCOUNTTYPE.BANK ? ofxData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS : ofxData.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS;
      const ofxTransactions = statement.BANKTRANLIST.STMTTRN;

      // process transactions
      for (const ofxTransaction of ofxTransactions) {
         // if it does not exists, skip it
         if (!databaseIds.includes(ofxTransaction.FITID)) {
            //console.log(`   SKIPPED: ${ofxTransaction.NAME} ${ofxTransaction.FITID}`);
            skippedCount++;
            continue;
         }

         // patch transaction
         var ofxPayee = ofxTransaction.NAME.trim();
         ofxPayee = ofxPayee.replace(/,/g, '');
         ofxPayee = ofxPayee.replace(/\t/g, '');
         var ofxMemo = ofxTransaction.MEMO ? ofxTransaction.MEMO.trim() : "";
         ofxMemo = ofxMemo.replace(/,/g, '');
         ofxMemo = ofxMemo.replace(/\t/g, '');

         var transaction = database.find(t => t.id == ofxTransaction.FITID);

         if (transaction.originalPayee != ofxPayee) {
            console.log(`   BACKFILLED ORIG PAYEE: ${transaction.date}\n\t${transaction.originalPayee}\n\t${ofxPayee}`);
            transaction.originalPayee = ofxPayee;
            backfilledCount++;
         }
         if (transaction.originalMemo != ofxMemo
            && transaction.originalMemo.length < ofxMemo.length
         ) {
            console.log(`   BACKFILLED ORIG MEMO: ${transaction.date}\n\t${transaction.originalMemo}\n\t${ofxMemo}`);
            transaction.originalMemo = ofxMemo;
            backfilledCount++;
         }
      }
   }

   // process database
   database.forEach(transaction => {
      if (transaction.memo != transaction.originalMemo
         && !transaction.originalMemo == ""  // very old transactions
         && !transaction.memo.includes(transaction.originalMemo)
         //&& !transaction.memo.includes("#exception")
         //&& !transaction.memo.includes("Concession")
         //&& transaction.accountId != "841002538"
         //&& transaction.accountId == "841002538"
         //&& transaction.memo.length < transaction.originalMemo.length
     ) {
        console.log(`   BACKFILLED MEMO: ${transaction.date}\n\t*${transaction.memo}*\n\t*${transaction.originalMemo}*`);
        transaction.memo = transaction.originalMemo;
        backfilledCount++;
     }
   });

   // update database
   //database.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
   //const databaseData = HEADERS + csvjson.toCSV(database, {delimiter: ',', headers: 'none'}) + '\n';
   //fs.writeFileSync(DATABASEFILE, databaseData);
   console.log(`\nCOMPLETED: ${backfilledCount} backfilled, ${skippedCount} skipped`);

})();
