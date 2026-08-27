import React, { useEffect, useState } from 'react';
import API from './services/api';
import './App.css';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ account: '', type: 'income', amount: '', description: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load from localStorage on mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('accounts');
    const savedTransactions = localStorage.getItem('transactions');
    
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));

    // Try to sync with backend if online
    if (navigator.onLine) {
      syncWithBackend();
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncWithBackend();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync data with backend
  const syncWithBackend = () => {
    API.get('accounts/')
      .then(res => {
        setAccounts(res.data);
        localStorage.setItem('accounts', JSON.stringify(res.data));
        console.log('Accounts synced:', res.data);
      })
      .catch(err => console.error('Error loading accounts:', err));
    
    API.get('transactions/')
      .then(res => {
        setTransactions(res.data);
        localStorage.setItem('transactions', JSON.stringify(res.data));
        console.log('Transactions synced:', res.data);
      })
      .catch(err => console.error('Error loading transactions:', err));
  };

  // Calculate running balance for each transaction
  const getBalanceAtTransaction = (targetTx) => {
    const account = accounts.find(acc => acc.id === targetTx.account);
    if (!account) return 'N/A';

    // Get all transactions for this account, sorted by date
    const accountTxs = transactions
      .filter(tx => tx.account === targetTx.account)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate initial balance by working backwards from current balance
    let initialBalance = parseFloat(account.balance) || 0;
    accountTxs.forEach(tx => {
      if (tx.type === 'income') {
        initialBalance -= parseFloat(tx.amount) || 0;
      } else {
        initialBalance += parseFloat(tx.amount) || 0;
      }
    });

    // Calculate balance after each transaction up to target
    let runningBalance = initialBalance;
    for (let tx of accountTxs) {
      if (tx.type === 'income') {
        runningBalance += parseFloat(tx.amount) || 0;
      } else {
        runningBalance -= parseFloat(tx.amount) || 0;
      }
      if (tx.id === targetTx.id) {
        return runningBalance.toFixed(2);
      }
    }
    return 'N/A';
  };

  // Handle adding a new transaction
 const handleSubmit = (e) => {
  e.preventDefault();

  // Validate form inputs
  if (!form.account) {
    alert('Please select an account');
    return;
  }
  if (!form.amount || parseFloat(form.amount) <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  const payload = {
    account: parseInt(form.account),
    type: form.type,
    amount: parseFloat(form.amount),
    description: form.description,
    date: new Date().toISOString().split('T')[0] // Add current date
  };

  if (isOnline) {
    // Send to backend
    API.post('transactions/', payload)
      .then(res => {
        const updatedTransactions = [...transactions, res.data];
        setTransactions(updatedTransactions);
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        setForm({ account: '', type: 'income', amount: '', description: '' });
        
        // Refresh accounts
        API.get('accounts/').then(res => {
          setAccounts(res.data);
          localStorage.setItem('accounts', JSON.stringify(res.data));
        });
      })
      .catch(err => {
        console.error("Transaction error:", err.response?.data || err.message);
        alert('Error adding transaction: ' + (err.response?.data?.detail || err.message));
      });
  } else {
    // Save offline locally
    const newTransaction = {
      id: Date.now(), // Temporary ID
      ...payload,
      synced: false
    };
    
    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    
    // Update account balance locally
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === parseInt(form.account)) {
        const balanceChange = payload.type === 'income' 
          ? parseFloat(acc.balance) + parseFloat(payload.amount)
          : parseFloat(acc.balance) - parseFloat(payload.amount);
        return { ...acc, balance: balanceChange };
      }
      return acc;
    });
    setAccounts(updatedAccounts);
    localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
    
    setForm({ account: '', type: 'income', amount: '', description: '' });
    alert('Transaction saved offline. It will sync when you\'re online.');
  }
};


  return (
    <div className="App">
      <h1>Business Tracker</h1>
      <p style={{ color: isOnline ? 'green' : 'red', fontWeight: 'bold' }}>
        {isOnline ? '✓ Online' : '✗ Offline Mode'}
      </p>

      <h2>Accounts</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Name</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(acc => (
            <tr key={acc.id}>
              <td data-label="Name">{acc.name}</td>
              <td data-label="Balance">{acc.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add Transaction</h2>
      <form onSubmit={handleSubmit}>
        <select
          value={form.account}
          onChange={e => setForm({ ...form, account: e.target.value })}
        >
          <option value="">Select Account</option>
          {accounts.length > 0 ? (
            accounts.filter(acc => acc.id === 1).map(acc => (
              <option key={acc.id} value={String(acc.id)}>
                {acc.name}
              </option>
            ))
          ) : (
            <option disabled>No accounts available</option>
          )}
        </select>

        <select
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value })}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />

        <button type="submit">Add</button>
      </form>

      <h2>Transactions</h2>
      <button onClick={() => window.print()} style={{ marginBottom: '15px' }}>
        📄 Print to PDF
      </button>
      <table border="1">
        <thead>
          <tr>
            <th>Date</th>
            <th>Account</th>
            <th>Description</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => {
            const accountName = accounts.find(acc => acc.id === tx.account)?.name || 'Unknown';
            return (
              <tr key={tx.id}>
                <td data-label="Date">{tx.date ? new Date(tx.date).toLocaleDateString('en-GB') : 'N/A'}</td>
                <td data-label="Account">{accountName}</td>
                <td data-label="Description">{tx.description}</td>
                <td data-label="Type" style={{ color: tx.type === 'income' ? 'green' : 'red' }}>
                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                </td>
                <td data-label="Amount" style={{ color: tx.type === 'income' ? 'green' : 'red' }}>
                  {tx.amount}
                </td>
                <td data-label="Balance">{getBalanceAtTransaction(tx)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

    </div>
  );
}

export default App;
