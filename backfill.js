/***
 * Use this script to manually update the database file. Mostly likely needs to be edited before use.
 * 1. download a historic qfx file
 * 2. in index.js, temporarily comment out the already exists check and the database update
 * 3. execute npm run start (convert it)
 * 4. in this file, create/alter matching option
 * 5. execute npm run backfill
 * 6. compare backfilled database to the real one
 * 7. if good, overwrite
 */

import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

const DOWNLOADSFOLDER = path.join(os.homedir(), 'Downloads');
const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const DATABASEBACKFILLLEDFILE = path.join(os.homedir(), 'Downloads', 'transactions-backfilled.csv');
const HEADERS = 'date,payee,category,amount,notes,checknum,institution,type,id';

(async () => {

   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});
   const databaseIds = database.filter(i => i.id !== null && i.id.trim() !== "").map(i => i.id);

   for (const file of fs.readdirSync(DOWNLOADSFOLDER)) {
      if (!file.toLowerCase().endsWith('patched.csv')) {
         console.log(`SKIPPING: ${file}`);
         continue;
      }

      // read patched transactions file
      const csvFile = path.join(DOWNLOADSFOLDER, file);
      const transactions = csvjson.toObject(fs.readFileSync(csvFile).toString(), {delimiter: ',', quote: '"'});

      // safety check - analyze dates with transactions that have the same amount
      const badDates = [];
      const dateAmountMap = transactions.reduce((acc, e) => {
         const key = e['date'];
         const group = acc[key] ?? [];
         return { ...acc, [key]: [...group, e.Amount] };
      }, {});
      for (const date of Object.keys(dateAmountMap)) {
         const amounts = dateAmountMap[date];
         const hasDuplicates = (new Set(amounts)).size !== amounts.length
         if (hasDuplicates) {
            badDates.push(date);
            console.log(`${date}: ${amounts.sort((a,b) => a.localeCompare(b))}`);
         }
      }
      //console.log(`BAD DATES: $(badDates)`);

      // process transactions
      for (const transaction of transactions) {
         // OPTION A - to backfile notes, checknum, and id
         const entry = database.find(e => { return e.date === transaction.Date && e.amount === transaction.Amount && e.notes === '' && e.id === ''; });
         // OPTION B - to backfill notes and checknum
         //const entry = database.find(e => { return e.id === transaction.id; })

         // if we couldn't find a match, then skip it; shouldn't happen
         if (!entry) {
            console.log(`DNE: ${JSON.stringify(transaction)}`);
            continue;
         }

         // if it is a multiple date/amount, then skip it for manual editing
         const count = (dateAmountMap[entry.date]).reduce((acc, obj) => {return obj === entry.amount ? acc + 1 : acc;}, 0);
         if (count > 1) {
            console.log(`MANUAL EDIT: ${JSON.stringify(transaction)}`);
            continue;
         }

         // update transaction
         console.log(`${entry.date}, ${entry.amount}, ${entry.payee} | ${transaction.payee}, ${transaction.notes}, ${transaction.checkNum}, ${transaction.id}`);
         entry.notes = transaction.notes;
         entry.checknum = transaction.checknum;
         entry.id = transaction.id;
      }
   }

   database.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
   const databaseData = HEADERS + csvjson.toCSV(database, {delimiter: ',', headers: 'none'}) + '\n';
   fs.writeFileSync(DATABASEBACKFILLLEDFILE, databaseData);

})();
