import React, { useState, useEffect } from 'react';
import API from '../services/api';

function BookSetup({ onBookSelected }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    start_date: new Date().toISOString().split('T')[0],
    opening_balance: 0
  });
  const [error, setError] = useState('');

  // Load user's books
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = () => {
    setLoading(true);
    API.get('books/')
      .then(res => {
        const booksData = Array.isArray(res.data) ? res.data : res.data.results || [];
        setBooks(booksData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading books:', err);
        setError('Failed to load books. Please try again.');
        setLoading(false);
      });
  };

  const handleCreateBook = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name) {
      setError('Please enter a book name');
      return;
    }
    if (!formData.year) {
      setError('Please enter a year');
      return;
    }

    const payload = {
      name: formData.name,
      year: parseInt(formData.year),
      start_date: formData.start_date,
      opening_balance: parseFloat(formData.opening_balance) || 0
    };

    API.post('books/', payload)
      .then(res => {
        // Book created successfully
        setFormData({
          name: '',
          year: new Date().getFullYear(),
          start_date: new Date().toISOString().split('T')[0],
          opening_balance: 0
        });
        setShowCreateForm(false);
        // Refresh book list
        fetchBooks();
        // Auto-select the new book
        onBookSelected(res.data);
      })
      .catch(err => {
        console.error('Book creation error:', err);
        setError(err.response?.data?.detail || 'Error creating book. Please try again.');
      });
  };

  const handleSelectBook = (book) => {
    if (book.status === 'closed') {
      setError('This book is closed. Please select an active book.');
      return;
    }
    onBookSelected(book);
  };

  if (loading) {
    return (
      <div className="book-setup">
        <h1>💰 Business Tracker</h1>
        <div className="loading-spinner">Loading your books...</div>
      </div>
    );
  }

  return (
    <div className="book-setup">
      <div className="book-setup-header">
        <h1>💰 Business Tracker</h1>
        <p className="subtitle">Select or create a financial year book</p>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="book-list-section">
        <div className="book-list-header">
          <h2>Your Books</h2>
          <button 
            className="btn-create-book"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '− Cancel' : '+ New Book'}
          </button>
        </div>

        {/* Create Book Form */}
        {showCreateForm && (
          <div className="create-book-form">
            <h3>Create New Financial Year Book</h3>
            <form onSubmit={handleCreateBook}>
              <div className="form-group">
                <label>Book Name</label>
                <input
                  type="text"
                  placeholder="e.g., 2024 Financial Year"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Opening Balance (Total from previous book)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.opening_balance}
                  onChange={e => setFormData({...formData, opening_balance: e.target.value})}
                />
                <small>If this is your first book, leave as 0.00</small>
              </div>

              <button type="submit" className="btn-submit">
                Create Book
              </button>
            </form>
          </div>
        )}

        {/* Book List */}
        <div className="book-list">
          {books.length === 0 ? (
            <div className="empty-state">
              <p>No books created yet.</p>
              <p className="hint">Click "New Book" to start your first financial year.</p>
            </div>
          ) : (
            books.map(book => (
              <div 
                key={book.id} 
                className={`book-card ${book.status === 'closed' ? 'closed' : 'active'}`}
              >
                <div className="book-info">
                  <div className="book-name">{book.name}</div>
                  <div className="book-year">Year: {book.year}</div>
                  <div className="book-status">
                    <span className={`status-badge ${book.status}`}>
                      {book.status === 'active' ? '✅ Active' : '🔒 Closed'}
                    </span>
                  </div>
                  {book.total_balance !== undefined && (
                    <div className="book-balance">
                      Total Balance: ₦{parseFloat(book.total_balance).toLocaleString()}
                    </div>
                  )}
                </div>
                {book.status === 'active' && (
                  <button 
                    className="btn-select-book"
                    onClick={() => handleSelectBook(book)}
                  >
                    Open Book →
                  </button>
                )}
                {book.status === 'closed' && (
                  <span className="book-closed-label">Closed</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BookSetup;