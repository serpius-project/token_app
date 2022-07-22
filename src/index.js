import 'regenerator-runtime/runtime'
import { initContract, login, logout } from './utils'

import getConfig from './config'
//const { networkId } = getConfig(process.env.NODE_ENV || 'development')
const { networkId } = getConfig('mainnet')

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

  window.time_date = [];
  window.price_data = [];
  window.price_data_btc = [];

  rawFile = new XMLHttpRequest();
  rawFile.open("GET", "https://swap.serpius.com/stats.json", false);
  rawFile.onreadystatechange = function () {
    if (rawFile.readyState === 4) {
      if (rawFile.status === 200 || rawFile.status == 0) {
        var allText = JSON.parse(rawFile.responseText);
        for (let i = 0; i < allText['prices'].length; i++) {
          sdate = new Date(allText['prices'][i][0]);
          //          window.time_date[i] = sdate; //parseInt(allText['prices'][i][0]);
          window.time_date[i] = String(sdate.getDate()).padStart(2, '0') + "/" + String(sdate.getMonth() + 1).padStart(2, '0') + "/" + String(sdate.getFullYear()).slice(2, 4);
          //          window.time_date[i] = /*String(sdate.getDate()).padStart(2, '0') + "." +*/ String(sdate.getMonth() + 1).padStart(2, '0') + "." + String(sdate.getFullYear()).slice(2,4);
          window.price_data[i] = allText['prices'][i][1];
          window.price_data_btc[i] = allText['prices'][i][2];
        }
      }
    }
  }
  rawFile.send(null);

  // for (let j = 0; j < coin_list.length; j++) {
  //   rawFile = new XMLHttpRequest();
  //   rawFile.open("GET", "https://api.coingecko.com/api/v3/coins/" + coin_list[j] + "/market_chart/range?vs_currency=usd&from=" + (one_year_ago).toString() + "&to=" + (now_date).toString(), false);
  //   rawFile.onreadystatechange = function () {
  //     if (rawFile.readyState === 4) {
  //       if (rawFile.status === 200 || rawFile.status == 0) {
  //         var allText = JSON.parse(rawFile.responseText);
  //         for (let i = 0; i < allText['prices'].length; i++) {
  //           if (j == 0) {
  //             sdate = new Date(allText['prices'][i][0]);
  //             window.time_date[i] = String(sdate.getDate()).padStart(2, '0') + "." + String(sdate.getMonth() + 1).padStart(2, '0');
  //             window.price_data[i] = (allText['prices'][i][1] * window.distro_s[0] + window.distro_s[coin_list.length]) * window.multi;
  //           } else {
  //             window.price_data[i] += allText['prices'][i][1] * window.distro_s[j] * window.multi;
  //           }
  //         }
  //       }
  //     }
  //   }
  //   rawFile.send(null);
  // }


}

window.commarize = function commarize(x) {
  // Alter numbers larger than 1k
  if (x >= 1e3) {
    var units = ["k", "M", "B", "T"];
    var order = Math.floor(Math.log(x) / Math.log(1000));
    var unitname = units[(order - 1)];
    var num = Math.round(x * 100 / 1000 ** order) / 100;
    // output number remainder + unitname
    return num + unitname
  }
  return Math.round(x * 100) / 100;
}

// update global currentGreeting variable; update DOM with it
window.fetchBalance = async function fetchBalance() {

  let account_string = window.accountId.toString();
  if (account_string.length < 18) {
    document.getElementById("account_id").innerHTML = '<i class="fa fa-user-circle" aria-hidden="true"></i>' + " " + account_string;
  } else {
    document.getElementById("account_id").innerHTML = '<i class="fa fa-user-circle" aria-hidden="true"></i>' + " " + account_string.substring(0, 14) + "...";
  }
  //document.getElementById("account_id").innerHTML = '<i class="fa fa-user-circle" aria-hidden="true"></i>' + " " + '********.testnet';

  balance = await contract.ft_balance_of({ account_id: window.accountId })
  window.decimals = (await contract.ft_metadata({})).decimals
  document.getElementById("l_balance").innerHTML = Math.round(balance * 1000 / 10 ** decimals) / 1000 + ' SER'
  window.total_supply = await contract.ft_total_supply({});
  near_balance = await account.getAccountBalance();
  document.getElementById("l_balance_near").innerHTML = Math.round(near_balance.available * 1000 / 10 ** 24) / 1000 + ' NEAR';
  window.near_asset = Math.floor(near_balance.available * 100000000 / 10 ** 24) / 100000000;
  window.serpius_asset = Math.floor(balance * 100000000 / 10 ** decimals) / 100000000;

  window.distro = await contract.check_distro({});
  window.distro[0] = window.distro[0] / 10 ** 24;
  window.distro[1] = window.distro[1] / 10 ** 8;
  window.distro[2] = window.distro[2] / 10 ** 18;
  window.distro[3] = window.distro[3] / 10 ** 6;

  window.distro_s = await contract.check_distro_norm({});
  get_prices();
  window.distro_real = [];
  distro_real_norm = 0;
  for (let i = 0; i < window.distro.length; i++) {
    window.distro_real[i] = window.distro[i] * window.prices[i];
    distro_real_norm += window.distro_real[i];
  }

  for (let i = 0; i < window.distro.length; i++) {
    window.distro_real[i] = Math.round(1000 * window.distro_real[i] / distro_real_norm);
  }

  let labels_pie_c = ['NEAR', 'BTC', 'ETH', 'USDC'];
  window.labels_pie = [];
  window.assets_pie = [];
  for (let i = 0; i < labels_pie_c.length; i++) {
    if (window.distro_s[i] > -1) {
      length1 = (labels_pie_c[i].toString()).length;
      length2 = ((window.distro_real[i] / 10).toFixed(1) + '%').toString().length;
      window.labels_pie.push(labels_pie_c[i].toString() + " \u2022 " + ((window.distro_real[i] / 10).toFixed(1) + '%').toString());
      window.assets_pie.push(window.distro_real[i] / 10);
    }
  }

  window.multi = 1.0 / (total_supply / 10 ** decimals);

  let dollar_near = Math.round(near_balance.available * window.prices[0] * 100 / 10 ** 24) / 100;
  document.getElementById("total_usd").innerHTML = "$ " + commarize(dollar_near);
  //from here

  let total_value = 0;
  for (let i = 0; i < 4; i++) {
    total_value += window.distro[i] * window.prices[i];
  }
  ser_price = total_value * window.multi;
  let dollar_serpius = Math.round(ser_price * balance * 100 / 10 ** decimals) / 100;
  document.getElementById("total_ser").innerHTML = '$ ' + commarize(dollar_serpius);
  document.getElementById("total_ser_near").innerHTML = commarize(Math.round(dollar_serpius * 100 / window.prices[0]) / 100);

  document.getElementById("btc_1").innerHTML = "<strong>BTC </strong>$" + window.prices[1].toFixed(0);
  document.getElementById("btc_2").innerHTML = "<strong>BTC </strong>$" + window.prices[1].toFixed(0);
  document.getElementById("eth_1").innerHTML = "<strong>ETH </strong>$" + window.prices[2].toFixed(0);
  document.getElementById("eth_2").innerHTML = "<strong>ETH </strong>$" + window.prices[2].toFixed(0);
  document.getElementById("near_1").innerHTML = "<strong>NEAR </strong>$" + window.prices[0].toFixed(2);
  document.getElementById("near_2").innerHTML = "<strong>NEAR </strong>$" + window.prices[0].toFixed(2);
  document.getElementById("ser_1").innerHTML = "<strong>SER </strong>$" + ser_price.toFixed(2);
  document.getElementById("ser_2").innerHTML = "<strong>SER </strong>$" + ser_price.toFixed(2);
  document.getElementById("supply_1").innerHTML = "<strong>SPLY </strong>" + (total_supply / 10 ** decimals).toFixed(2);
  document.getElementById("supply_2").innerHTML = "<strong>SPLY </strong>" + (total_supply / 10 ** decimals).toFixed(2);
  document.getElementById("mc_1").innerHTML = "<strong>MC </strong>$" + (total_supply * ser_price / 10 ** decimals).toFixed(2);
  document.getElementById("mc_2").innerHTML = "<strong>MC </strong>$" + (total_supply * ser_price / 10 ** decimals).toFixed(2);


  window.ser_near = ser_price / window.prices[0];
  if (window.actual_action == "BUY") {
    document.getElementById("conversion").innerHTML = '1 SER &#8776 ' + commarize(window.ser_near) + ' NEAR';
  } else {
    document.getElementById("conversion").innerHTML = '1 NEAR &#8776 ' + commarize(1.0 / window.ser_near) + ' SER';
  }

  let last_rb = await contract.check_last_rb_time({});
  last_rb = new Date( last_rb / 1000000 );
  document.getElementById("last_rebalance").innerHTML = "Last update: " + last_rb.toLocaleString();

  var ctx = document.getElementById('chart').getContext('2d');
  chartStatus = Chart.getChart('chart');
  if (chartStatus != undefined) { chartStatus.destroy() };
  var chart = new Chart(ctx, {
    type: 'doughnut',
    //    plugins: [ChartDataLabels],
    data: {
      labels: window.labels_pie,
      datasets: [{
        //        data: [0.8, 0.5, 1.0, 1.2],
        data: window.assets_pie,
//        backgroundColor: ['#E2CF56', '#E256AE', '#56E289', '#5668E2'],
        backgroundColor: ['#FF9621', '#D752AB', '#31A354', '#5668E2'],
        borderColor: '#F6F6FA',
        borderWidth: 2,
        offset: 0,
        hoverOffset: 4,
        rotation: -20,
        spacing: 0,
        borderRadius: 6
      }]
    },
    options: {
      //        aspectRatio: 1.77,
      radius: '80%',
      cutout: '80%',
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label;
              return label;
            }
          }
        },
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
          offset: 15,
          font: { size: "12vw" },
        },
        legend: {
          display: true,
          position: 'right',
          labels: {
            font: { size: "12vw" },
            textAlign: 'left',
            boxWidth: 10,
            boxHeight: 10,
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
        label: 'SER/USD',
        data: price_data,
        fill: true,
        backgroundColor: 'rgb(86, 104, 226, 0.3)',
        tension: 0.1,
        borderWidth: 2,
        borderColor: '#5668E2',
        pointRadius: 0,
        yAxisID: 'y',
      },
      {
        label: 'SER/BTC',
        data: price_data_btc,
        fill: true,
//        backgroundColor: 'rgb(226, 86, 174, 0.3)',
        backgroundColor: 'rgb(215, 82, 171, 0.3)',
        tension: 0.1,
        borderWidth: 2,
        borderColor: '#D752AB',
        pointRadius: 0,
        yAxisID: 'y1',
      }]
    },
    options: {
      //      animation: false,
      interaction: { intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';

              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(6);
              }
              return label;
            }
          }
        },
        legend: {
          onClick: function (e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            if (ci.isDatasetVisible(index)) {
              ci.hide(index);
              legendItem.hidden = true;
              if (index == 0) {
                ci.options.scales.y.ticks.color = 'white';
                ci.options.scales.y.ticks.font.size = '1vw';
              } else {
                ci.options.scales.y1.ticks.color = 'white';
                ci.options.scales.y1.ticks.font.size = '1vw';
              }
            } else {
              ci.show(index);
              if (index == 0) {
                ci.options.scales.y.ticks.color = '#696969';
                ci.options.scales.y.ticks.font.size = '11vw';
              } else {
                ci.options.scales.y1.ticks.color = '#696969';
                ci.options.scales.y1.ticks.font.size = '11vw';
              }
              legendItem.hidden = false;
            }
            ci.update();
          },
          display: true,
          position: 'top',
          labels: { font: { size: "11vw" }, color: '#696969' },
          align: 'start'
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
      //      scales: { x: { type: 'time', time: { parser: "yyyy-MM-dd" }, grid: { display: false }, ticks: { font: { size: "11vw" } } } },
      scales: {
        x: {
          title: { text: "Time (days)", display: false, font: { size: "11vw" } },
          grid: { display: true, drawOnChartArea: false },
          ticks: {
            font: { size: "11vw" }, color: '#696969', maxRotation: 0, autoSkipPadding: 10,
            callback: function (value, index, values) {
              let data1 = window.time_date[value];
              return data1.slice(3, 8);
            },
          },
        },
        y: {
          grace: '5%',
          title: { text: "SER/USD", display: false, font: { size: "11vw" } },
          grid: { display: true, drawOnChartArea: true },
          ticks: {
            count: 6,
            font: { size: "11vw" },
            callback: function (value, index, values) {
              if (value >= 1000000000 || value <= -1000000000) {
                return value / 1e9 + 'bill';
              } else if (value >= 1000000 || value <= -1000000) {
                return value / 1e6 + 'mill';
              } else if (value >= 1000 || value <= -1000) {
                return value / 1e3 + 'k';
              }
              return (Math.round(value * 100000) / 100000).toFixed(1);
            },
            color: '#696969'
          }
        },
        y1: {
          grace: '5%',
          title: { text: "SER/BTC", display: false, font: { size: "11vw" } },
          grid: { display: true, drawOnChartArea: false }, ticks: {
            count: 6,
            font: { size: "11vw" },
            color: '#696969',
            callback: function (value, index, values) {
              if (value >= 1000000000 || value <= -1000000000) {
                return value / 1e9 + 'bill';
              } else if (value >= 1000000 || value <= -1000000) {
                return value / 1e6 + 'mill';
              } else if (value >= 1000 || value <= -1000) {
                return value / 1e3 + 'k';
              }
              return (Math.round(value * 100000) / 100000).toFixed(5);
            }
          },
          position: 'right'
        }
      },
    }
  });

}

// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
  .then(() => {
    if (window.walletConnection.isSignedIn()) signedInFlow()
    else signedOutFlow()
  })
  .catch(console.error)

