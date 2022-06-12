import 'regenerator-runtime/runtime'
import { initContract, login, logout } from './utils'

import getConfig from './config'
const { networkId } = getConfig(process.env.NODE_ENV || 'development')

// global variable used throughout
let currentGreeting
// const submitButton = document.querySelector('form button')

// document.querySelector('form').onsubmit = async (event) => {
//   event.preventDefault()

//   // get elements from the form using their id attribute
//   const { fieldset, greeting } = event.target.elements

//   // disable the form while the value gets updated on-chain
//   fieldset.disabled = true

//   try {
//     // make an update call to the smart contract
//     await window.contract.set_greeting({
//       // pass the value that the user entered in the greeting field
//       message: greeting.value
//     })
//   } catch (e) {
//     alert(
//       'Something went wrong! ' +
//       'Maybe you need to sign out and back in? ' +
//       'Check your browser console for more info.'
//     )
//     throw e
//   } finally {
//     // re-enable the form, whether the call succeeded or failed
//     fieldset.disabled = false
//   }

//   // disable the save button, since it now matches the persisted value
//   submitButton.disabled = true

//   // update the greeting in the UI
//   await fetchBalance()

//   // show notification
//   document.querySelector('[data-behavior=notification]').style.display = 'block'

//   // remove notification again after css animation completes
//   // this allows it to be shown again next time the form is submitted
//   setTimeout(() => {
//     document.querySelector('[data-behavior=notification]').style.display = 'none'
//   }, 11000)
// }

// document.querySelector('input#greeting').oninput = (event) => {
//   if (event.target.value !== currentGreeting) {
//     submitButton.disabled = false
//   } else {
//     submitButton.disabled = true
//   }
// }

document.querySelector('#sign-in-button').onclick = login
document.querySelector('#sign-out-button').onclick = logout

// Display the signed-out-flow container
function signedOutFlow() {
  document.querySelector('#signed-out-flow').style.display = 'block'
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
  document.querySelector('#signed-in-flow').style.display = 'block'

  document.querySelectorAll('[data-behavior=account-id]').forEach(el => {
    el.innerText = window.accountId
  })

  // populate links in the notification box
  const accountLink = document.querySelector('[data-behavior=notification] a:nth-of-type(1)')
  accountLink.href = accountLink.href + window.accountId
  accountLink.innerText = '@' + window.accountId
  const contractLink = document.querySelector('[data-behavior=notification] a:nth-of-type(2)')
  contractLink.href = contractLink.href + window.contract.contractId
  contractLink.innerText = '@' + window.contract.contractId

  // update with selected networkId
  accountLink.href = accountLink.href.replace('testnet', networkId)
  contractLink.href = contractLink.href.replace('testnet', networkId)

  fetchBalance()
}

function get_prices() {

  var rawFile = new XMLHttpRequest();
  rawFile.open("GET", "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cethereum%2Cnear&vs_currencies=usd", false);
  rawFile.onreadystatechange = function () {
    if (rawFile.readyState === 4) {
      if (rawFile.status === 200 || rawFile.status == 0) {
        var allText = JSON.parse(rawFile.responseText);
        window.prices = [allText.near.usd, allText.bitcoin.usd, allText.ethereum.usd, 1.0];
      }
    }
  }
  rawFile.send(null);

  coin_list = ["near", "bitcoin", "ethereum"];
  now_date = Date.now() / 1000;
  one_year_ago = (now_date * 1000 - 2629800000) / 1000;
  window.time_date = [];
  window.price_data = [];

  for (let j = 0; j < coin_list.length; j++) {
    rawFile = new XMLHttpRequest();
    rawFile.open("GET", "https://api.coingecko.com/api/v3/coins/" + coin_list[j] + "/market_chart/range?vs_currency=usd&from=" + (one_year_ago).toString() + "&to=" + (now_date).toString(), false);
    rawFile.onreadystatechange = function () {
      if (rawFile.readyState === 4) {
        if (rawFile.status === 200 || rawFile.status == 0) {
          var allText = JSON.parse(rawFile.responseText);
          for (let i = 0; i < allText['prices'].length; i++) {
            if (j == 0) {
              sdate = new Date(allText['prices'][i][0]);
              window.time_date[i] = String(sdate.getDate()).padStart(2, '0') + "." + String(sdate.getMonth() + 1).padStart(2, '0');
              window.price_data[i] = (allText['prices'][i][1] * window.distro_s[0] + window.distro_s[coin_list.length]) * window.multi;
            } else {
              window.price_data[i] += allText['prices'][i][1] * window.distro_s[j] * window.multi;
            }
          }
        }
      }
    }
    rawFile.send(null);
  }


}
function commarize(min) {
  min = min || 1e3;
  // Alter numbers larger than 1k
  if (this >= min) {
    var units = ["k", "M", "B", "T"];

    var order = Math.floor(Math.log(this) / Math.log(1000));

    var unitname = units[(order - 1)];
    var num = Math.floor(this / 1000 ** order);

    // output number remainder + unitname
    return num + unitname
  }
  // return formatted original number
  return this.toLocaleString()
}
// update global currentGreeting variable; update DOM with it
async function fetchBalance() {
  document.getElementById("account_id").innerHTML = "<i style='font-size:calc(0.8em + 0.2vw); margin-right: 5px;' class='fas'>&#xf406;</i>" + " " + window.accountId;
//  document.getElementById("account_id").innerHTML = "<i style='font-size:calc(0.8em + 0.2vw); margin-right: 5px;' class='fas'>&#xf406;</i>" + " ********.testnet";

  balance = await contract.ft_balance_of({ account_id: window.accountId })
  window.decimals = (await contract.ft_metadata({})).decimals
  document.getElementById("l_balance").innerHTML = balance / 10 ** decimals + ' SER'
  window.total_supply = await contract.ft_total_supply({});
  near_balance = await account.getAccountBalance();
  document.getElementById("l_balance_near").innerHTML = Math.round(near_balance.available * 1000 / 10 ** 24) / 1000 + ' NEAR';
  window.near_asset = Math.round( near_balance.available * 100000000 / 10**24 ) / 100000000;
  window.serpius_asset = Math.round( balance * 100000000 / 10 ** decimals ) / 100000000;

  window.distro = await contract.check_distro({});
  window.distro_s = window.distro.slice();

  window.distro[0] = window.distro[0] / 10 ** 24;
  window.distro[1] = window.distro[1] / 10 ** 6;
  window.distro[2] = window.distro[2] / 10 ** 8;
  window.distro[3] = window.distro[3] / 10 ** 2;

  //  window.distro_s = window.distro;
  window.distro_s[0] = window.distro_s[0] / 10 ** 24;
  window.distro_s[1] = (10 ** -15) * window.distro_s[1] / 10 ** 6;
  window.distro_s[2] = window.distro_s[2] / 10 ** 8;
  window.distro_s[3] = 10 * window.distro_s[3] / 10 ** 2;

  window.multi = 1.0 / (total_supply / 10 ** decimals);

  get_prices();
  let dollar_near = Math.round(near_balance.available * window.prices[0] * 100 / 10 ** 24) / 100;
  document.getElementById("total_usd").innerHTML = "$ " + dollar_near;
  //from here

  let total_value = 0;
  for (let i = 0; i < 4; i++) {
    total_value += window.distro_s[i] * window.prices[i];
  }
  ser_price = total_value * window.multi;
  let dollar_serpius = Math.round(ser_price * balance * 100 / 10 ** decimals) / 100;
  document.getElementById("total_ser").innerHTML = '$ ' + dollar_serpius; 
  document.getElementById("total_ser_near").innerHTML = Math.round( dollar_serpius * 100 / window.prices[0] ) / 100;
  
  var ctx = document.getElementById('chart').getContext('2d');
  chartStatus = Chart.getChart('chart');
  if (chartStatus != undefined) { chartStatus.destroy() };
  var chart = new Chart(ctx, {
    type: 'doughnut',
    plugins: [ChartDataLabels],
    data: {
      labels: ['NEAR', 'BTC', 'ETH', 'USDC'],
      datasets: [{
        //        data: [0.8, 0.5, 1.0, 1.2],
        data: window.distro_s,
        backgroundColor: ['#E2CF56', '#56E289', '#5668E2', '#E256AE'],
        borderColor: '#ffffff',
        borderWidth: 4,
        hoverOffset: 4,
      }]
    },
    options: {
      //        aspectRatio: 1.77,
      radius: '70%',
      cutout: '80%',
      plugins: {
        datalabels: {
          formatter: (value, ctx) => {
            let sum = 0;
            let dataArr = ctx.chart.data.datasets[0].data;
            dataArr.map(data => {
              sum += data;
            });
            let percentage = (value * 100 / sum).toFixed(1) + "%";
            return percentage;
          },
          color: '#696969',
          align: 'end',
          offset: 10,
          font: { size: "12vw" }
        },
        legend: {
          display: true,
          position: 'right',
          labels: {
            font: { size: "12vw" }
          }
        },
        title: {
          display: false,
          text: 'Frequency (counts)',
          padding: {
            top: 0,
            bottom: 0
          }
        }
      },
      layout: {
        padding: {
          top: 0,
          bottom: 0
        },
        autoPadding: true,
      }
    }
  });

  var ctx2 = document.getElementById('chart2').getContext('2d');
  chartStatus = Chart.getChart('chart2');
  if (chartStatus != undefined) { chartStatus.destroy() };
  var chart2 = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: window.time_date,
      datasets: [{
        label: 'Price (USD)',
        data: price_data,
        fill: true,
        backgroundColor: 'rgb(86, 104, 226, 0.5)',
        tension: 0.1,
        borderWidth: 2,
        borderColor: '#5668E2',
        pointRadius: 0,
      }]
    },
    options: {
      //        aspectRatio: 1.77,
      plugins: {
        legend: {
          display: false,
          position: 'right',
        },
        title: {
          display: false,
          text: 'Price (USD)',
          position: 'left',
          padding: {
            top: 0,
            bottom: 0
          }
        }
      },
      layout: {
        padding: {
          top: 0,
          bottom: 0,
        },
        autoPadding: true,
      },
      //      scales: { x: { type: 'time', time: {unit: 'millisecond', displayFormats: {quarter: 'YYYY'}}, grid: { display: false }, ticks: { font: { size: "12vw" } } }, y: { grid: { display: true }, ticks: { font: { size: "12vw" } } } },
      scales: { x: { grid: { display: true, drawOnChartArea: true }, ticks: { font: { size: "11vw" }, maxRotation: 0, autoSkipPadding: 10 } }, y: { grid: { display: true, drawOnChartArea: true }, ticks: { font: { size: "11vw" }, callback: function (value, index, values) {
        if (value >= 1000000000 || value <= -1000000000) {
          return value / 1e9 + 'bill';
        } else if (value >= 1000000 || value <= -1000000) {
          return value / 1e6 + 'mill';
        } else if (value >= 1000 || value <= -1000) {
          return value / 1e3 + 'k';
        }
        return value;
      } } } },
    }
  });



  //to here

  document.querySelectorAll('[data-behavior=greeting]').forEach(el => {
    // set divs, spans, etc
    el.innerText = currentGreeting

    // set input elements
    el.value = currentGreeting
  })
}

// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
  .then(() => {
    if (window.walletConnection.isSignedIn()) signedInFlow()
    else signedOutFlow()
  })
  .catch(console.error)

