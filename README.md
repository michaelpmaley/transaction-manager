<a name="readme-top"></a>
<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Transaction Manager</h3>
  <p align="center">
    Set of scripts to import qfx files, audit the results, and generate a report.
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

This is a quick and dirty set of scripts to manage a csv file of bank/credit card transactions.
* import all *.qfx files in the ~/Downloads folder
   * patch the Payee and CategoryName fields based upon a mappings file
   * skip duplicate transactions based up the existing transactions in the database
* report the balance for each account and the monthly balance for the checking account
* audit the database for similarly named Payees, Payees with multiple categories, unmapped transactions, ...


Notes:
* All folder locations and filenames can be easily adjusted at the top of each .js file.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

1. Create a transaction mapping file, `~/Documents/Financial/transaction-mappings.json`.
It is a basic json array, for example:
```json
[
   {"ofxPattern": "AA WINDOW & GUTTER", "newPayee": "AA Window & Gutter", "newCategoryName": "Home"},
   {"ofxPattern": "ADTSECURITY", "newPayee": "ADT Security ↺", "newCategoryName": "Bills & Utilities"},
   {"ofxPattern": "ALASKA AIRLINES", "newPayee": "Alaska Airlines", "newCategoryName": "Travel"},
]
```
where the key is a regular expression that will match on payee or memo/note fields.

2. Create the initial database file, `~/Documents/Financial/transactions.csv`.
```
date,payee,categoryName,amount,memo,checknum,type,accountId,id,originalPayee,originalMemo
```

It will become a history of all processed transactions. For example:
```
date,payee,categoryName,amount,memo,checknum,type,accountId,id,originalPayee,originalMemo
2020-06-16,OUDE KERK AMSTERDAM AMSTERDAM,Misc Expense,-21.38,OUDE KERK AMSTERDAM AMSTERDAM 12/15 Euro       24.00 X 1.07000,,DEBIT,8888,202210000,,
2020-05-10,AplPay HUGENDUBEL MUMUENCHEN DE,Misc Expense,-11.22,BOOK STORE AplPay HUGENDUBEL MUENCHEN / MARIENPLATZ MUENCHEN DE,,DEBIT,8888,202048943,,
2020-05-04,Amazon,Shopping,-3.19,55555-BC9RQXWEFGP DIGITAL PRIME VIDEO *I60589RS3 888-222-3333 TX,,DEBIT,9999,190003580174349989,,
2020-04-21,Starbucks,Food & Dining,-25.00,33333-99VlpqMavbq 8007137942 STARBUCKS 800-777-2222 TX,,DEBIT,9999,190229472900044339,,
```



### Installation

1. Clone the repo.
   ```sh
   git clone https://github.com/michaelpmaley/transaction-manager.git
   ```

2. Install NPM packages.
   ```sh
   npm install
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

1. Browse to each financial institution and download the latest transactions in Quicken (qfx) format. Don't worry about the start date overlapping too much because existing transactions will be skipped.

2. In the project folder, run the script.
```sh
   npm run import
```

3. Use the audit script to look for inconsistent data.
```sh
   npm run audit
```

4. Use the report script to see current balances, net worth over time, ...
```sh
   npm run report
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Your Name - [@twitter_handle](https://twitter.com/twitter_handle) - email@email_client.com

Project Link: [https://github.com/michaelpmaley/convert-qfx](https://github.com/michaelpmaley/convert-qfx)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/michaelpmaley/convert-qfx.svg?style=for-the-badge
[contributors-url]: https://github.com/michaelpmaley/convert-qfx/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/michaelpmaley/convert-qfx.svg?style=for-the-badge
[forks-url]: https://github.com/michaelpmaley/convert-qfx/network/members
[stars-shield]: https://img.shields.io/github/stars/michaelpmaley/convert-qfx.svg?style=for-the-badge
[stars-url]: https://github.com/michaelpmaley/convert-qfx/stargazers
[issues-shield]: https://img.shields.io/github/issues/michaelpmaley/convert-qfx.svg?style=for-the-badge
[issues-url]: https://github.com/michaelpmaley/convert-qfx/issues
[license-shield]: https://img.shields.io/github/license/michaelpmaley/convert-qfx.svg?style=for-the-badge
[license-url]: https://github.com/michaelpmaley/convert-qfx/blob/master/LICENSE
