import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
import { Plot, LabelPositionFlags, PlotAxisScale, PlotSeriesAggregationFn, PlotSeriesOverflow, Color, BackgroundColor } from 'text-graph.js';

const CHECKINGACCOUNT = 'CHASE'; // TODO: FUTURE more flexible if match
const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const CURRENCYFORMATTER = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD' });

(async () => {

   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});

   const institutions = [...new Set(database.map(i => i.institution).sort())];
   const accounts = new Map(institutions.map(i => [i, 0]));
   //const categories = [...new Set(database.map(i => i.category).sort())];
   //const payees = [...new Set(database.map(i => i.payee).sort())];
   const netbymonth = new Map();
   const bankaccountbymonth = new Map();

   database.forEach(transaction => {
      // running balance per account
      accounts.set(transaction.institution, accounts.get(transaction.institution) + parseFloat(transaction.amount));

      // running net per month
      let month = transaction.date.slice(0, 7);
      if (!netbymonth.has(month)) {
         netbymonth.set(month, parseFloat(transaction.amount));
      } else {
         netbymonth.set(month, parseFloat(netbymonth.get(month)) + parseFloat(transaction.amount));
      }

      if (transaction.institution === CHECKINGACCOUNT) {
         if (!bankaccountbymonth.has(month)) {
            bankaccountbymonth.set(month, parseFloat(transaction.amount));
         } else {
            bankaccountbymonth.set(month, parseFloat(bankaccountbymonth.get(month)) + parseFloat(transaction.amount));
         }
      }
   });

   // convert the map from monthly net to monthly balance by summing from the earliest entry
   let bankaccountbalance = 0;
   for (let entry of [...bankaccountbymonth].reverse()) {
      bankaccountbalance = parseFloat(entry[1]) + parseFloat(bankaccountbalance);
      bankaccountbymonth.set(entry[0], bankaccountbalance);
   }

   console.log(`${"ACCOUNTS ".padEnd(40, '=')}`);
   let totalBalance = 0;
   accounts.forEach((balance, account) => {
      totalBalance += balance;
      console.log(`${account.padEnd(8)} ${CURRENCYFORMATTER.format(balance).padStart(13)}`);
   });
   console.log(`         -------------`);
   console.log(`         ${CURRENCYFORMATTER.format(totalBalance).padStart(13)}`);
   console.log(`\n\n`);

   console.log(`${"BANK ACCOUNT BALANCE BY MONTH ".padEnd(40, '=')}`);
   const plot = new Plot(160, 20);
   const id = plot.addSeries();
   plot.addSeriesRange(id, Array.from(bankaccountbymonth.values()).reverse());
   const chartData = plot.paint();
   console.log(chartData);
   console.log(`\n\n`)

   //console.log(`${"BANK ACCOUNT BALANCE BY MONTH ".padEnd(40, '=')}`);
   //bankaccountbymonth.forEach((balance, month) => {
   //   console.log(`${month}: ${CURRENCYFORMATTER.format(balance).padStart(13)}`);
   //});
   //console.log(`\n\n`);

   //console.log(`${"NET BY MONTH ".padEnd(40, '=')}`);
   //netbymonth.forEach((amount, month) => {
   //   console.log(`${month}: ${CURRENCYFORMATTER.format(amount).padStart(13)}`);
   //});
   //console.log(`\n\n`);

})();
