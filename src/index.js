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

// update global currentGreeting variable; update DOM with it
async function fetchBalance() {
  balance = await contract.ft_balance_of({ account_id: window.accountId })
  decimals = (await contract.ft_metadata({})).decimals
  document.getElementById("l_balance").innerHTML = balance / 10 ** decimals + ' SER'

  near_balance = await account.getAccountBalance();
  document.getElementById("l_balance_near").innerHTML = Math.round(near_balance.available * 1000 / 10 ** 24) / 1000 + ' NEAR'

  window.distro = await contract.check_distro({});
  window.distro[0] = window.distro[0] / 10 ** 24;
  window.distro[1] = (10**-15) * window.distro[1] / 10 ** 6;
  window.distro[2] = window.distro[2] / 10 ** 8;
  window.distro[3] = 10 * window.distro[3] / 10 ** 2;

  //from here

  var ctx = document.getElementById('chart').getContext('2d');
  chartStatus = Chart.getChart('chart');
  if (chartStatus != undefined) { chartStatus.destroy() };
  var chart = new Chart(ctx, {
    type: 'doughnut',
    plugins: [ChartDataLabels],
    data: {
      labels: ['BTC', 'ETH', 'NEAR', 'USDC'],
      datasets: [{
//        data: [0.8, 0.5, 1.0, 1.2],
        data: window.distro,
        backgroundColor: ['#E2CF56', '#56E289', '#5668E2', '#E256AE'],
        borderColor: '#ffffff',
        borderWidth: 4,
        hoverOffset: 4,
      }]
    },
    options: {
      //        aspectRatio: 1.77,
      radius: '80%',
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
          font: { size: "13vw" }
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

