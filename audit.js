import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
import stringSimilarity from 'string-similarity';

const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const CATEGORYNAMELIST = ["Activities & Entertainment","Auto & Transport","Balance","Bills & Utilities","Business Services","Fees & Charges","Food & Dining","Charitable Donations","Healthcare: Medical & Dental","Healthcare: Premiums","Healthcare: Prescriptions","Home","Income","Misc Expense","Personal Care","Shopping","Taxes: Federal","Taxes: Local","Taxes: State","Transfer","Travel", "UNKNOWN"];

(async () => {

   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});

   console.log(`CATEGORIES ========================================`);
   const categoryNames = [...new Set(database.map(i => i.categoryName).sort())];
   categoryNames.forEach(categoryName => {
      if (CATEGORYNAMELIST.indexOf(categoryName) === -1) {
         console.log(`INCORRECT: ${categoryName}`);
      }
   });
   console.log("\n\n");

   console.log(`PAYEES ========================================`);
   const payees = [...new Set(database.map(i => i.payee).sort())];
   payees.forEach(payee => {
      const payeeCategories = [...new Set(database.filter(i => i.payee === payee).map(i => i.categoryName).sort())];
      if (payeeCategories.length > 1) {
         console.log(`MULTIPLE: ${payee}: ${payeeCategories}`);
      }
   });
   console.log(`\n`);
   for (var i = 0; i < payees.length-1; i++) {
      let payee = payees[i];
      var matches = stringSimilarity.findBestMatch(payee, payees.slice(i+1));
      matches.ratings.forEach(match => {
         if (match.rating > .73 && match.rating != 1 && match.target.indexOf('airport') == -1 && match.target.indexOf('↺') == -1) {
            console.log(`SIMILIAR: ${payee} ~= ${match.target}`);
         }
      });
   }
   console.log(`\n\n`);

   console.log(`TRANSACTIONS ========================================`);
   database.forEach(transaction => {
      if (transaction.categoryName === 'UNKNOWN') {
         console.log(`UNMAPPED: ${transaction.date}, ${transaction.payee}, ${transaction.amount}, ${transaction.memo}`);
      }
      let p = transaction.amount.split('.');
      if (p[1] == null || p[1].length != 2) {
         console.log(`ODD: ${JSON.stringify(transaction)}`);
      }
   });
   console.log(`\n\n`);

})();
