import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import BookSetup from './components/BookSetup';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      // Check for saved book
      const savedBook = localStorage.getItem('selectedBook');
      if (savedBook) {
        try {
          setSelectedBook(JSON.parse(savedBook));
        } catch (e) {
          localStorage.removeItem('selectedBook');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('selectedBook');
    setIsAuthenticated(false);
    setSelectedBook(null);
  };

  const handleBookSelected = (book) => {
    setSelectedBook(book);
    localStorage.setItem('selectedBook', JSON.stringify(book));
  };

  const handleBackToBooks = () => {
    setSelectedBook(null);
    localStorage.removeItem('selectedBook');
  };

  if (isLoading) {
    return <div className="loading-app">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Logout button in top-right */}
      <div className="app-header">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {!selectedBook ? (
        <BookSetup onBookSelected={handleBookSelected} />
      ) : (
        <Dashboard book={selectedBook} onBack={handleBackToBooks} />
      )}
    </div>
  );
}

export default App;