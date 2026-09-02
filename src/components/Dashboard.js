import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

function Dashboard({ book, onBack }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ account: '', type: 'income', amount: '', description: '' });
  const [accountForm, setAccountForm] = useState({ name: '', balance: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showEditAccountForm, setShowEditAccountForm] = useState(false);
  const [showEditTransactionForm, setShowEditTransactionForm] = useState(false);

  const fetchBookData = useCallback(() => {
    setLoading(true);
    
    API.get(`accounts/?book=${book.id}`)
      .then(res => {
        const accountsData = Array.isArray(res.data) ? res.data : res.data.results || [];
        setAccounts(accountsData);
        localStorage.setItem(`accounts_${book.id}`, JSON.stringify(accountsData));
      })
      .catch(err => console.error('Error loading accounts:', err));

    API.get(`transactions/?book=${book.id}`)
      .then(res => {
        const transactionsData = Array.isArray(res.data) ? res.data : res.data.results || [];
        setTransactions(transactionsData);
        localStorage.setItem(`transactions_${book.id}`, JSON.stringify(transactionsData));
      })
      .catch(err => console.error('Error loading transactions:', err))
      .finally(() => setLoading(false));
  }, [book]);

  useEffect(() => {
    if (book) {
      fetchBookData();
    }
  }, [book, fetchBookData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchBookData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchBookData]);

  useEffect(() => {
    if (book) {
      const savedAccounts = localStorage.getItem(`accounts_${book.id}`);
      const savedTransactions = localStorage.getItem(`transactions_${book.id}`);
      
      if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    }
  }, [book]);

  // ========================================
  // ACCOUNT CRUD
  // ========================================

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
      book: book.id,
      name: accountForm.name,
      balance: parseFloat(accountForm.balance)
    };

    if (isOnline) {
      API.post('accounts/', payload)
        .then(res => {
          setAccountForm({ name: '', balance: '' });
          alert('Account created successfully!');
          fetchBookData();
        })
        .catch(err => {
          console.error("Account creation error:", err);
          alert('Error creating account: ' + (err.response?.data?.detail || err.message));
        });
    } else {
      const newAccount = {
        id: Date.now(),
        ...payload,
        synced: false
      };
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      localStorage.setItem(`accounts_${book.id}`, JSON.stringify(updatedAccounts));
      setAccountForm({ name: '', balance: '' });
      alert('Account saved offline. It will sync when online.');
    }
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setShowEditAccountForm(true);
  };

  const handleUpdateAccount = (e) => {
    e.preventDefault();
    if (!editingAccount.name) {
      alert('Please enter an account name');
      return;
    }
    if (!editingAccount.balance || parseFloat(editingAccount.balance) < 0) {
      alert('Please enter a valid balance');
      return;
    }

    const payload = {
      name: editingAccount.name,
      balance: parseFloat(editingAccount.balance)
    };

    if (isOnline) {
      API.put(`accounts/${editingAccount.id}/`, payload)
        .then(res => {
          setShowEditAccountForm(false);
          setEditingAccount(null);
          alert('Account updated successfully!');
          fetchBookData();
        })
        .catch(err => {
          console.error("Account update error:", err);
          alert('Error updating account: ' + (err.response?.data?.detail || err.message));
        });
    } else {
      const updatedAccounts = accounts.map(acc => {
        if (acc.id === editingAccount.id) {
          return { ...acc, ...payload, synced: false };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      localStorage.setItem(`accounts_${book.id}`, JSON.stringify(updatedAccounts));
      setShowEditAccountForm(false);
      setEditingAccount(null);
      alert('Account updated offline. It will sync when online.');
    }
  };

  const handleDeleteAccount = (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) {
      return;
    }

    if (isOnline) {
      API.delete(`accounts/${accountId}/`)
        .then(() => {
          alert('Account deleted successfully!');
          fetchBookData();
        })
        .catch(err => {
          console.error("Account delete error:", err);
          alert('Error deleting account: ' + (err.response?.data?.detail || err.message));
        });
    } else {
      const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
      const updatedTransactions = transactions.filter(tx => tx.account_ids && !tx.account_ids.includes(accountId));
      setAccounts(updatedAccounts);
      setTransactions(updatedTransactions);
      localStorage.setItem(`accounts_${book.id}`, JSON.stringify(updatedAccounts));
      localStorage.setItem(`transactions_${book.id}`, JSON.stringify(updatedTransactions));
      alert('Account deleted offline. It will sync when online.');
    }
  };

  // ========================================
  // TRANSACTION CRUD
  // ========================================

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

    const payload = {
      book: book.id,
      account_ids: [parseInt(form.account)],
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description || ''
    };

    if (isOnline) {
      API.post('transactions/', payload)
        .then(res => {
          setTransactions([res.data, ...transactions]);
          localStorage.setItem(`transactions_${book.id}`, JSON.stringify([res.data, ...transactions]));
          setForm({ account: '', type: 'income', amount: '', description: '' });
          fetchBookData();
        })
        .catch(err => {
          console.error("Transaction error:", err);
          alert('Error adding transaction: ' + (err.response?.data?.detail || err.message));
        });
    } else {
      const selectedAccount = accounts.find(acc => acc.id === parseInt(form.account));
      const newTransaction = {
        id: Date.now(),
        ...payload,
        accounts: selectedAccount ? [selectedAccount] : [],
        date: new Date().toISOString(),
        synced: false
      };
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      localStorage.setItem(`transactions_${book.id}`, JSON.stringify(updatedTransactions));
      
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
      localStorage.setItem(`accounts_${book.id}`, JSON.stringify(updatedAccounts));
      
      setForm({ account: '', type: 'income', amount: '', description: '' });
      alert('Transaction saved offline. It will sync when online.');
    }
  };

  const handleEditTransaction = (transaction) => {
    let accountId = '';
    if (transaction.account_ids && transaction.account_ids.length > 0) {
      accountId = transaction.account_ids[0];
    } else if (transaction.accounts && transaction.accounts.length > 0) {
      accountId = transaction.accounts[0];
    }
    
    setEditingTransaction({
      ...transaction,
      account: accountId
    });
    setShowEditTransactionForm(true);
  };

  const handleUpdateTransaction = (e) => {
    e.preventDefault();
    if (!editingTransaction.account) {
      alert('Please select an account');
      return;
    }
    if (!editingTransaction.amount || parseFloat(editingTransaction.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const payload = {
      book: book.id,
      account_ids: [parseInt(editingTransaction.account)],
      type: editingTransaction.type,
      amount: parseFloat(editingTransaction.amount),
      description: editingTransaction.description || ''
    };

    if (isOnline) {
      API.put(`transactions/${editingTransaction.id}/`, payload)
        .then(() => {
          setShowEditTransactionForm(false);
          setEditingTransaction(null);
          alert('Transaction updated successfully!');
          fetchBookData();
        })
        .catch(err => {
          console.error("Transaction update error:", err);
          alert('Error updating transaction: ' + (err.response?.data?.detail || err.message));
        });
    } else {
      const updatedTransactions = transactions.map(tx => {
        if (tx.id === editingTransaction.id) {
          const selectedAccount = accounts.find(acc => acc.id === parseInt(editingTransaction.account));
          return { 
            ...tx, 
            ...payload, 
            accounts: selectedAccount ? [selectedAccount] : [],
            synced: false 
          };
        }
        return tx;
      });
      setTransactions(updatedTransactions);
      localStorage.setItem(`transactions_${book.id}`, JSON.stringify(updatedTransactions));
      setShowEditTransactionForm(false);
      setEditingTransaction(null);
      alert('Transaction updated offline. It will sync when online.');
    }
  };

  const handleDeleteTransaction = (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    if (isOnline) {
      API.delete(`transactions/${transactionId}/`)
        .then(() => {
          alert('Transaction deleted successfully!');
          fetchBookData();
        })
        .catch(err => {
          console.error("Transaction delete error:", err);
          alert('Error deleting transaction: ' + (err.response?.data?.detail || err.message));
        });
    } else {
      const updatedTransactions = transactions.filter(tx => tx.id !== transactionId);
      setTransactions(updatedTransactions);
      localStorage.setItem(`transactions_${book.id}`, JSON.stringify(updatedTransactions));
      alert('Transaction deleted offline. It will sync when online.');
    }
  };

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  const getAccountName = (tx) => {
    if (tx.account_details && tx.account_details.length > 0) {
      return tx.account_details[0].name;
    }
    if (tx.accounts && tx.accounts.length > 0) {
      if (typeof tx.accounts[0] === 'object') {
        return tx.accounts[0].name;
      }
      if (typeof tx.accounts[0] === 'number') {
        const acc = accounts.find(a => a.id === tx.accounts[0]);
        return acc ? acc.name : 'Unknown';
      }
    }
    return 'Unknown';
  };

  const getBalanceAtTransaction = (tx) => {
    if (tx.account_details && tx.account_details.length > 0) {
      return parseFloat(tx.account_details[0].balance).toFixed(2);
    }
    if (tx.accounts && tx.accounts.length > 0) {
      const account = tx.accounts[0];
      if (typeof account === 'object' && account.balance !== undefined) {
        return parseFloat(account.balance).toFixed(2);
      }
      if (typeof account === 'number') {
        const acc = accounts.find(a => a.id === account);
        return acc ? parseFloat(acc.balance).toFixed(2) : 'N/A';
      }
    }
    return 'N/A';
  };

  const handlePrint = () => window.print();

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
  const totalTransactions = transactions.reduce((sum, tx) => {
    return sum + (tx.type === 'income' ? parseFloat(tx.amount) : -parseFloat(tx.amount));
  }, 0);

  return (
    <div className="dashboard-container">
      {/* Book Header */}
      <div className="book-header">
        <div className="book-info">
          <h2>📚 {book.name}</h2>
          <span className="book-year">Year: {book.year}</span>
          <span className="book-status-badge">Active</span>
        </div>
        <button className="btn-back" onClick={onBack}>
          ← Switch Book
        </button>
      </div>

      <p style={{ color: isOnline ? 'green' : 'red', fontWeight: 'bold' }}>
        {isOnline ? '✓ Online' : '✗ Offline Mode'}
      </p>

      {/* ========================================
          ACCOUNTS TABLE
          ======================================== */}
      <h2>Accounts</h2>
      <div className="table-wrapper">
        <table border="1">
          <thead>
            <tr>
              <th>Name</th>
              <th>Balance</th>
              <th className="desktop-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.id}>
                <td data-label="Name">{acc.name}</td>
                <td data-label="Balance">₦{parseFloat(acc.balance).toFixed(2)}</td>
                <td data-label="Actions" className="desktop-only">
                  
                  <button 
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="btn-delete"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
              <td>Total</td>
              <td>₦{totalBalance.toFixed(2)}</td>
              <td className="desktop-only">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Action Buttons for Accounts */}
      <div className="mobile-actions">
        {accounts.map(acc => (
          <div key={acc.id} className="mobile-action-row">
            <span className="mobile-item-name">{acc.name}</span>
            <div className="mobile-action-buttons">
              <button 
                onClick={() => handleEditAccount(acc)}
                className="btn-edit-mobile"
              >
                ✏️
              </button>
              <button 
                onClick={() => handleDeleteAccount(acc.id)}
                className="btn-delete-mobile"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================
          EDIT ACCOUNT FORM (Modal)
          ======================================== */}
      {showEditAccountForm && editingAccount && (
        <div className="edit-form-overlay">
          <div className="edit-form-modal">
            <h3>✏️ Edit Account</h3>
            <form onSubmit={handleUpdateAccount}>
              <div className="form-group">
                <label>Account Name</label>
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingAccount.balance}
                  onChange={e => setEditingAccount({ ...editingAccount, balance: e.target.value })}
                  required
                />
              </div>
              <div className="edit-form-actions">
                <button type="submit" className="btn-save">💾 Save</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditAccountForm(false);
                    setEditingAccount(null);
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          CREATE ACCOUNT FORM
          ======================================== */}
      <h2>Create New Account</h2>
      <form onSubmit={handleCreateAccount} className="create-form">
        <input
          type="text"
          placeholder="Account Name (e.g., Main, Savings)"
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

      {/* ========================================
          ADD TRANSACTION FORM
          ======================================== */}
      <h2>Add Transaction</h2>
      <form onSubmit={handleSubmit} className="transaction-form">
        <select
          value={form.account}
          onChange={e => setForm({ ...form, account: e.target.value })}
        >
          <option value="">Select Account</option>
          {accounts.map(acc => (
            <option key={acc.id} value={String(acc.id)}>
              {acc.name}
            </option>
          ))}
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

      {/* ========================================
          TRANSACTIONS TABLE
          ======================================== */}
      <h2>Transactions</h2>
      <button onClick={handlePrint} className="no-print" style={{ marginBottom: '15px' }}>
        📄 Print to PDF
      </button>

      <div className="table-wrapper">
        <table border="1">
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance</th>
              <th className="desktop-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map(tx => {
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
                      ₦{parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td data-label="Balance">₦{balance}</td>
                    <td data-label="Actions" className="desktop-only">
                      <button 
                        onClick={() => handleEditTransaction(tx)}
                        className="btn-edit"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="btn-delete"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}>
              <td colSpan="4">TOTAL</td>
              <td>₦{totalTransactions.toFixed(2)}</td>
              <td>—</td>
              <td className="desktop-only">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Action Buttons for Transactions */}
      <div className="mobile-actions">
        {transactions
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(tx => {
            const accountName = getAccountName(tx);
            return (
              <div key={tx.id} className="mobile-action-row">
                <span className="mobile-item-name">{accountName}: ₦{parseFloat(tx.amount).toFixed(2)}</span>
                <div className="mobile-action-buttons">
                  <button 
                    onClick={() => handleEditTransaction(tx)}
                    className="btn-edit-mobile"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteTransaction(tx.id)}
                    className="btn-delete-mobile"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ========================================
          EDIT TRANSACTION FORM (Modal)
          ======================================== */}
      {showEditTransactionForm && editingTransaction && (
        <div className="edit-form-overlay">
          <div className="edit-form-modal">
            <h3>✏️ Edit Transaction</h3>
            <form onSubmit={handleUpdateTransaction}>
              <div className="form-group">
                <label>Account</label>
                <select
                  value={editingTransaction.account}
                  onChange={e => setEditingTransaction({ ...editingTransaction, account: e.target.value })}
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={String(acc.id)}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={editingTransaction.type}
                  onChange={e => setEditingTransaction({ ...editingTransaction, type: e.target.value })}
                  required
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTransaction.amount}
                  onChange={e => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editingTransaction.description || ''}
                  onChange={e => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                />
              </div>
              <div className="edit-form-actions">
                <button type="submit" className="btn-save">💾 Save</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditTransactionForm(false);
                    setEditingTransaction(null);
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;