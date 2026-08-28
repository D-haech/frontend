import React, { useEffect, useState } from 'react';
import API from './services/api';
import './App.css';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ account: '', type: 'income', amount: '', description: '' });
  const [accountForm, setAccountForm] = useState({ name: '', balance: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load from localStorage on mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('accounts');
    const savedTransactions = localStorage.getItem('transactions');
    
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));

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


  // Add this to debug account updates
useEffect(() => {
  console.log('Accounts state updated:', accounts);
}, [accounts]);

  const syncWithBackend = () => {
    API.get('accounts/')
      .then(res => {
        const accountsData = Array.isArray(res.data) ? res.data : res.data.accounts || [];
        setAccounts(accountsData);
        localStorage.setItem('accounts', JSON.stringify(accountsData));
        console.log('Accounts synced:', accountsData);
      })
      .catch(err => console.error('Error loading accounts:', err));
    
    API.get('transactions/')
      .then(res => {
        const transactionsData = Array.isArray(res.data) ? res.data : res.data.results || [];
        setTransactions(transactionsData);
        localStorage.setItem('transactions', JSON.stringify(transactionsData));
        console.log('Transactions synced:', transactionsData);
      })
      .catch(err => console.error('Error loading transactions:', err));
  };

  // 🔥 FIXED: Get account name from transaction
  const getAccountName = (tx) => {
    // If we have account_details from backend
    if (tx.account_details && tx.account_details.length > 0) {
      return tx.account_details[0].name;
    }
    
    // If accounts is an array of objects with name
    if (tx.accounts && tx.accounts.length > 0) {
      if (typeof tx.accounts[0] === 'object') {
        return tx.accounts[0].name;
      }
      // If it's just an ID, look it up
      if (typeof tx.accounts[0] === 'number') {
        const acc = accounts.find(a => a.id === tx.accounts[0]);
        return acc ? acc.name : 'Unknown';
      }
    }
    
    return 'Unknown';
  };

  // 🔥 FIXED: Get balance at transaction
  const getBalanceAtTransaction = (tx) => {
    // Get balance from account_details
    if (tx.account_details && tx.account_details.length > 0) {
      return parseFloat(tx.account_details[0].balance).toFixed(2);
    }
    
    // Get balance from accounts array
    if (tx.accounts && tx.accounts.length > 0) {
      const account = tx.accounts[0];
      if (typeof account === 'object' && account.balance !== undefined) {
        return parseFloat(account.balance).toFixed(2);
      }
      // If only ID, find from accounts state
      if (typeof account === 'number') {
        const acc = accounts.find(a => a.id === account);
        return acc ? parseFloat(acc.balance).toFixed(2) : 'N/A';
      }
    }
    
    return 'N/A';
  };

  const handleCreateAccount = (e) => {
  e.preventDefault();

  if (!accountForm.name) {
    alert('Please enter an account name');
    return;
  }
  if (!accountForm.balance || parseFloat(accountForm.balance) < 0) {
    alert('Please enter a valid balance');
    return;
  }

  const payload = {
    name: accountForm.name,
    balance: parseFloat(accountForm.balance)
  };

  if (isOnline) {
    API.post('accounts/', payload)
      .then(res => {
        console.log('Account created:', res.data); // ← ADD THIS
        setAccountForm({ name: '', balance: '' });
        alert('Account created successfully!');
        
        // 🔥 FIX: Force refresh accounts immediately
        API.get('accounts/')
          .then(response => {
            const accountsData = Array.isArray(response.data) 
              ? response.data 
              : response.data.accounts || [];
            console.log('Updated accounts:', accountsData); // ← ADD THIS
            setAccounts(accountsData);
            localStorage.setItem('accounts', JSON.stringify(accountsData));
          })
          .catch(err => console.error('Error refreshing accounts:', err));
      })
      .catch(err => {
        console.error("Account creation error:", err.response?.data || err.message);
        alert('Error creating account: ' + (err.response?.data?.detail || err.message));
      });
  } else {
    const newAccount = {
      id: Math.max(...accounts.map(a => a.id || 0), 0) + 1,
      name: accountForm.name,
      balance: parseFloat(accountForm.balance),
      synced: false
    };
    
    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);
    localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
    setAccountForm({ name: '', balance: '' });
    alert('Account saved offline. It will sync when you\'re online.');
  }
};

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.account) {
      alert('Please select an account');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // 🔥 FIXED: Send account_ids as array
    const payload = {
      account_ids: [parseInt(form.account)],
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description || ''
    };
    
    if (isOnline) {
      console.log('📤 Sending transaction payload:', payload);
      console.log('📤 Account selected:', form.account);
      console.log('📤 Accounts available:', accounts);

      API.post('transactions/', payload)
        .then(res => {
          const updatedTransactions = [res.data, ...transactions];
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
      const newTransaction = {
        id: Date.now(),
        ...payload,
        synced: false
      };
      
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
      
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
        <tfoot>
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
            <td>Total</td>
            <td>
              {accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      
      <h2>Create New Account</h2>
      <form onSubmit={handleCreateAccount}>
        <input
          type="text"
          placeholder="Account Name (e.g., Cash at hand, POS)"
          value={accountForm.name}
          onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
        />

        <input
          type="number"
          placeholder="Initial Balance"
          step="0.01"
          value={accountForm.balance}
          onChange={e => setAccountForm({ ...accountForm, balance: e.target.value })}
        />

        <button type="submit">Create Account</button>
      </form>
      
      <h2>Add Transaction</h2>
      <form onSubmit={handleSubmit}>
        <select
          value={form.account}
          onChange={e => setForm({ ...form, account: e.target.value })}
        >
          <option value="">Select Account</option>
          {accounts.length > 0 ? (
            accounts.map(acc => (
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
          {transactions
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(tx => {
            // 🔥 FIXED: Use the helper functions
            const accountName = getAccountName(tx);
            const balance = getBalanceAtTransaction(tx);
            
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
                <td data-label="Balance">{balance}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;