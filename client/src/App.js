//import React, { useState, useEffect } from "react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import "./App.css";
import axios from "axios";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  LinearScale,
  BarElement,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';


// Register ChartJS components
ChartJS.register(
  ArcElement,
  LinearScale,
  BarElement,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Define chart components outside App
const PieChartComponent = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return <Pie ref={chartRef} data={data} />;
};

const BarChartComponent = ({ data, options }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return <Bar ref={chartRef} data={data} options={options} />;
};

function App() {
  const API_BASE_URL = 'http://localhost:5000/api';
  const [view, setView] = useState("home");
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", username: "", password: "", confirmPassword: "" });
  const [loginUser, setLoginUser] = useState({ username: "", password: "" });
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [payees, setPayees] = useState([]);
  const [pendingPayees, setPendingPayees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  
  // Form states
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [selectedPayee, setSelectedPayee] = useState("");
  const [newPayee, setNewPayee] = useState({
    customerName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: ""
  });
  const [allUsers, setAllUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);

  // Add these data fetching functions
  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users`);
      setAllUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions`);
      setAllTransactions(res.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchUserTransactions = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions/history/${userId}`);
      setUserTransactions(res.data);
      setSelectedUserForDetails(userId);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
    }
  };

  // Combined handleAdminLogin function
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (adminCredentials.username === "admin" && adminCredentials.password === "admin123") {
      await fetchPendingPayees();
      await fetchAllUsers();
      await fetchAllTransactions();
      setView("adminDashboard");
    } else {
      alert("Invalid Admin Credentials");
    }
  };

  // Add these chart data preparation functions
  const prepareTransactionTypeChartData = () => {
    const typeCounts = {
      deposit: 0,
      withdrawal: 0,
      'transfer-out': 0,
      'transfer-in': 0
    };

    allTransactions.forEach(txn => {
      if (typeCounts.hasOwnProperty(txn.type)) {
        typeCounts[txn.type]++;
      }
    });

    return {
      labels: Object.keys(typeCounts).map(key => getTypeLabel(key)),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: [
          '#4CAF50', // deposit - green
          '#F44336', // withdrawal - red
          '#FF9800', // transfer-out - orange
          '#2196F3'  // transfer-in - blue
        ]
      }]
    };
  };

  const prepareUserBalanceChartData = () => {
    const usersByMonth = {};
    
    allUsers.forEach(user => {
      const date = new Date(user.createdAt);
      const monthYear = `${date.getMonth()+1}/${date.getFullYear()}`;
      usersByMonth[monthYear] = (usersByMonth[monthYear] || 0) + 1;
    });

    return {
      labels: Object.keys(usersByMonth),
      datasets: [{
        label: 'Users Registered',
        data: Object.values(usersByMonth),
        backgroundColor: '#2196F3'
      }]
    };
  };

  // Helper functions
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getTypeLabel = (type) => {
    const labels = {
      'deposit': 'Deposit',
      'withdrawal': 'Withdrawal',
      'transfer-out': 'Transfer Out',
      'transfer-in': 'Transfer In'
    };
    return labels[type] || type;
  };

  // Data fetching functions
  const fetchBalance = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions/balance/${userId}`);
      const newBalance = res.data.balance || 0;
      setBalance(newBalance);
      return newBalance;
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
      return 0;
    }
  };

  const fetchPayees = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/payees/user/${userId}`);
      setPayees(res.data);
    } catch (error) {
      console.error("Error fetching payees:", error);
      setPayees([]);
    }
  };

  const fetchTransactions = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions/history/${userId}`);
      setTransactions(res.data.data || res.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchPendingPayees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/payees/pending`);
      setPendingPayees(res.data);
    } catch (error) {
      console.error("Error fetching pending payees:", error);
    }
  };

  // Auth handlers
  const handleUserRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/users/register`, userForm);
      alert("Registered successfully");
      setView("userLogin");
    } catch (error) {
      alert(error.response?.data?.error || error.response?.data?.msg || "Registration error");
    }
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/users/login`, loginUser);
      if (res.data.msg === "Login successful") {
        setUser(res.data.user);
        await fetchBalance(res.data.user._id);
        await fetchPayees(res.data.user._id);
        await fetchTransactions(res.data.user._id);
        setView("userDashboard");
      } else {
        alert(res.data.msg || "Login failed");
      }
    } catch (error) {
      alert(error.response?.data?.error || error.response?.data?.msg || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Transaction handlers
  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount)) {
      alert("Please enter a valid number");
      return;
    }
    if (amount <= 0) {
      alert("Amount must be positive");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/transactions/deposit`, {
        userId: user._id,
        amount: amount
      });
      
      if (res.data && typeof res.data.balance !== 'undefined') {
        setBalance(res.data.balance);
        alert(`Successfully deposited ₹${amount.toFixed(2)}. New balance: ₹${res.data.balance.toFixed(2)}`);
      } else {
        setBalance(prev => (prev || 0) + amount);
        alert(`Successfully deposited ₹${amount.toFixed(2)}`);
      }
      
      setDepositAmount("");
      await fetchTransactions(user._id);
    } catch (error) {
      console.error("Deposit error:", error);
      alert(error.response?.data?.message || "Deposit failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount)) {
      alert("Please enter a valid number");
      return;
    }
    if (amount <= 0) {
      alert("Amount must be positive");
      return;
    }
    if (balance < amount) {
      alert("Insufficient funds");
      return;
    }
  
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/transactions/withdraw`, {
        userId: user._id,
        amount: amount,
        reason: withdrawReason
      });
      
      if (res.data && typeof res.data.balance !== 'undefined') {
        setBalance(res.data.balance);
        alert(`Successfully withdrew ₹${amount.toFixed(2)}. New balance: ₹${res.data.balance.toFixed(2)}`);
      } else {
        setBalance(prev => (prev || 0) - amount);
        alert(`Successfully withdrew ₹${amount.toFixed(2)}`);
      }
      
      setWithdrawAmount("");
      setWithdrawReason("");
      await fetchTransactions(user._id);
    } catch (error) {
      console.error("Withdrawal error:", error);
      alert(error.response?.data?.message || "Withdrawal failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!selectedPayee) {
      alert("Please select a payee");
      return;
    }
  
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount.toString() !== transferAmount.trim()) {
      alert("Please enter a valid number");
      return;
    }
    if (amount <= 0) {
      alert("Amount must be positive");
      return;
    }
    if (balance < amount) {
      alert("Insufficient funds");
      return;
    }
  
    setIsLoading(true);
    try {
      const transferRes = await axios.post(`${API_BASE_URL}/transactions/transfer`, {
        userId: user._id,
        payeeId: selectedPayee,
        amount: amount
      });
      
      if (transferRes.data?.balance !== undefined) {
        setBalance(transferRes.data.balance);
        alert(`Successfully transferred ₹${amount.toFixed(2)}. New balance: ₹${transferRes.data.balance.toFixed(2)}`);
      } else {
        const freshBalance = await fetchBalance(user._id);
        setBalance(freshBalance);
        alert(`Successfully transferred ₹${amount.toFixed(2)}. New balance: ₹${freshBalance.toFixed(2)}`);
      }
  
      setTransferAmount("");
      setSelectedPayee("");
      await fetchTransactions(user._id);
    } catch (error) {
      console.error("Transfer error:", error);
      alert(error.response?.data?.message || "Transfer failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Other handlers
  const handleApprovePayee = async (payeeId) => {
    try {
      await axios.put(`${API_BASE_URL}/payees/approve/${payeeId}`);
      alert("Payee approved");
      await fetchPendingPayees();
    } catch (error) {
      alert("Failed to approve payee");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/users/update/${user._id}`, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        username: user.username
      });
      alert("Profile updated successfully");
      setUser(res.data.user);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayee = async (e) => {
    e.preventDefault();
    
    if (!newPayee.customerName || !newPayee.accountNumber || !newPayee.ifscCode) {
      alert("Please fill all required fields");
      return;
    }
  
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/payees`, {
        userId: user._id,
        ...newPayee
      });
      
      alert("Payee added successfully. Waiting for admin approval.");
      setNewPayee({
        customerName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: ""
      });
      await fetchPayees(user._id);
    } catch (error) {
      console.error("Add payee error:", error);
      alert(error.response?.data?.message || "Failed to add payee");
    } finally {
      setIsLoading(false);
    }
  };

  // Transaction History Component
  const TransactionHistory = ({ onClose }) => {
    return (
      <div className="transaction-history">
        <div className="history-header">
          <h2>Transaction History</h2>
          <button onClick={onClose} className="btn close-btn">×</button>
        </div>

        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn._id}>
                    <td>{formatDate(txn.createdAt)}</td>
                    <td>{getTypeLabel(txn.type)}</td>
                    <td className={txn.type === 'deposit' || txn.type === 'transfer-in' ? 'positive' : 'negative'}>
                      {txn.type === 'deposit' || txn.type === 'transfer-in' ? '+' : '-'}
                      ₹{txn.amount.toFixed(2)}
                    </td>
                    <td>
                      <span className={`status-badge ${txn.status}`}>
                        {txn.status}
                      </span>
                    </td>
                    <td>
                      {txn.reason && <div><strong>Reason:</strong> {txn.reason}</div>}
                      {txn.payeeId && <div><strong>Payee:</strong> {txn.payeeId.customerName}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Admin Dashboard Component
  const AdminDashboard = () => {
    const transactionTypeData = prepareTransactionTypeChartData();
  const userBalanceData = prepareUserBalanceChartData();

    return (
      <div className="dashboard">
        <h2>Admin Dashboard</h2>
        <button className="btn" onClick={() => setView("home")}>Logout</button>
        <div className="admin-sections">
          {/* Charts Section */}
          <div className="charts-section">
            <h3>Transaction Statistics</h3>
            <div className="chart-row">
              <div className="chart-container">
                <h4>Transaction Types</h4>
                <PieChartComponent data={transactionTypeData} />
              </div>
              <div className="chart-container">
                <h4>User Registrations</h4>
                <BarChartComponent 
            data={userBalanceData} 
            options={{ 
              scales: { 
                y: { 
                  beginAtZero: true 
                } 
              } 
            }} 
          />
              </div>
            </div>
          </div>

          <div className="users-section">
            <h3>All Users</h3>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(user => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn small"
                          onClick={() => fetchUserTransactions(user._id)}
                        >
                          View Transactions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedUserForDetails && (
            <div className="user-transactions-section">
              <h3>Transactions for User: {
                allUsers.find(u => u._id === selectedUserForDetails)?.name
              }</h3>
              <button 
                className="btn small"
                onClick={() => setSelectedUserForDetails(null)}
              >
                Close
              </button>
              <div className="transactions-table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTransactions.length > 0 ? (
                      userTransactions.map(txn => (
                        <tr key={txn._id}>
                          <td>{formatDate(txn.createdAt)}</td>
                          <td>{getTypeLabel(txn.type)}</td>
                          <td className={
                            txn.type === 'deposit' || txn.type === 'transfer-in' ? 
                            'positive' : 'negative'
                          }>
                            ₹{txn.amount.toFixed(2)}
                          </td>
                          <td>
                            <span className={`status-badge ${txn.status}`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="no-data">
                          No transactions found for this user
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pending-payees-section">
            <h3>Pending Payee Approvals</h3>
            {pendingPayees.length === 0 ? (
              <p>No pending payee approvals</p>
            ) : (
              <ul className="payee-list">
                {pendingPayees.map(payee => (
                  <li key={payee._id} className="payee-item">
                    <p><strong>Customer:</strong> {payee.customerName}</p>
                    <p><strong>Bank:</strong> {payee.bankName}</p>
                    <p><strong>Account:</strong> {payee.accountNumber}</p>
                    <p><strong>IFSC:</strong> {payee.ifscCode}</p>
                    <button 
                      onClick={() => handleApprovePayee(payee._id)} 
                      className="btn"
                    >
                      Approve
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main App Render
  return (
    <div className="App">
      <header><h1>SecureBank</h1></header>
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      {view === "home" && (
        <main className="hero-section">
          <h2>Welcome to SecureBank</h2>
          <p>Your trusted partner in digital banking.</p>
          <div className="btn-group">
            <button onClick={() => setView("adminLogin")} className="btn">Admin</button>
            <button onClick={() => setView("user")} className="btn">User</button>
          </div>
          <section className="features">
            <div className="feature-card">
              <i className="fas fa-wallet"></i>
              <h3>Check Balance</h3>
              <p>Instantly view your current balance anytime, anywhere.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-exchange-alt"></i>
              <h3>Transfer Money</h3>
              <p>Send money securely with our fast transfer system.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-money-bill-wave"></i>
              <h3>Withdraw Funds</h3>
              <p>Withdraw funds easily to your linked accounts.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-user-edit"></i>
              <h3>Update Profile</h3>
              <p>Manage your profile safely and efficiently.</p>
            </div>
          </section>
        </main>
      )}

      {view === "adminLogin" && (
        <div className="form-card">
          <h2>Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input type="text" placeholder="Username" onChange={(e) => setAdminCredentials({ ...adminCredentials, username: e.target.value })} />
            <input type="password" placeholder="Password" onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })} />
            <button type="submit" className="btn">Login</button>
          </form>
        </div>
      )}

      {view === "adminDashboard" && <AdminDashboard />}

      {view === "user" && (
        <div className="form-card">
          <h2>User Portal</h2>
          <button onClick={() => setView("userRegister")} className="btn">Register</button>
          <button onClick={() => setView("userLogin")} className="btn">Login</button>
        </div>
      )}

      {view === "userRegister" && (
        <div className="form-card">
          <h2>User Registration</h2>
          <form onSubmit={handleUserRegister}>
            <input type="text" placeholder="Full Name" required onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            <input type="email" placeholder="Email" required onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            <input type="text" placeholder="Phone" required onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            <input type="text" placeholder="Username" required onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
            <input type="password" placeholder="Password" required onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            <input type="password" placeholder="Confirm Password" required onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })} />
            <button type="submit" className="btn">Register</button>
          </form>
        </div>
      )}

      {view === "userLogin" && (
        <div className="form-card">
          <h2>User Login</h2>
          <form onSubmit={handleUserLogin}>
            <input type="text" placeholder="Username" required onChange={(e) => setLoginUser({ ...loginUser, username: e.target.value })} />
            <input type="password" placeholder="Password" required onChange={(e) => setLoginUser({ ...loginUser, password: e.target.value })} />
            <button type="submit" className="btn">Login</button>
          </form>
        </div>
      )}

      {view === "userDashboard" && user && (
        <div className="dashboard">
          <h2>User Dashboard</h2>
          <p>Welcome, {user.name}!</p>
          <p>Your current balance: ₹{balance !== null ? balance.toFixed(2) : "Loading..."}</p>
          
          <div className="dashboard-actions">
            <button className="btn" onClick={() => setView("deposit")}>Deposit Money</button>
            <button className="btn" onClick={() => setView("withdraw")}>Withdraw Money</button>
            <button className="btn" onClick={() => setView("transfer")}>Transfer Money</button>
            <button className="btn" onClick={() => setView("addPayee")}>Add Payee</button>
            <button className="btn" onClick={() => setView("updateProfile")}>Update Profile</button>
            <button className="btn" onClick={() => setShowTransactionHistory(true)}>
              Transaction History
            </button>
            <button className="btn" onClick={() => setView("home")}>Logout</button>
          </div>
        </div>
      )}

      {showTransactionHistory && (
        <TransactionHistory onClose={() => setShowTransactionHistory(false)} />
      )}

      {view === "deposit" && (
        <div className="transaction-page">
          <div className="form-card">
            <h2>Deposit Money</h2>
            <form onSubmit={handleDeposit}>
              <input 
                type="number" 
                placeholder="Amount" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)} 
                min="0.01"
                step="0.01"
                required
              />
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? "Processing..." : "Deposit"}
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setView("userDashboard")}
                disabled={isLoading}
              >
                Back to Dashboard
              </button>
            </form>
          </div>

          <div className="recent-transactions">
            <h3>Recent Transactions</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map(txn => (
                  <tr key={txn._id}>
                    <td>{formatDate(txn.createdAt)}</td>
                    <td>{getTypeLabel(txn.type)}</td>
                    <td className={txn.type === 'deposit' ? 'positive' : 'negative'}>
                      ₹{txn.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "withdraw" && (
        <div className="transaction-page">
          <div className="form-card">
            <h2>Withdraw Money</h2>
            <form onSubmit={handleWithdraw}>
              <input 
                type="number" 
                placeholder="Amount" 
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)} 
                min="1"
                required
              />
              <input 
                type="text" 
                placeholder="Reason for withdrawal" 
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)} 
                required
              />
              <button type="submit" className="btn">Withdraw</button>
              <button className="btn" onClick={() => setView("userDashboard")}>Back to Dashboard</button>
            </form>
          </div>

          <div className="recent-transactions">
            <h3>Recent Transactions</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map(txn => (
                  <tr key={txn._id}>
                    <td>{formatDate(txn.createdAt)}</td>
                    <td>{getTypeLabel(txn.type)}</td>
                    <td className={txn.type === 'deposit' ? 'positive' : 'negative'}>
                      ₹{txn.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "transfer" && (
        <div className="transaction-page">
          <div className="form-card">
            <h2>Transfer Money</h2>
            <form onSubmit={handleTransfer} noValidate>
              <select 
                value={selectedPayee}
                onChange={(e) => setSelectedPayee(e.target.value)}
                required
                className="form-select"
              >
                <option value="">Select Payee</option>
                {payees.filter(p => p.status === "approved").map(payee => (
                  <option key={payee._id} value={payee._id}>
                    {payee.customerName} - {payee.accountNumber}
                  </option>
                ))}
              </select>
              <input 
                type="number" 
                placeholder="Amount" 
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)} 
                min="1"
                step="0.01"
                required
                className="form-input"
              />
              <div className="form-actions">
                <button type="submit" className="btn" disabled={isLoading}>
                  {isLoading ? "Processing..." : "Transfer"}
                </button>
                <button 
                  type="button" 
                  className="btn secondary"
                  onClick={() => setView("userDashboard")}
                  disabled={isLoading}
                >
                  Back to Dashboard
                </button>
              </div>
            </form>
          </div>

          <div className="recent-transactions">
            <h3>Recent Transactions</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map(txn => (
                  <tr key={txn._id}>
                    <td>{formatDate(txn.createdAt)}</td>
                    <td>{getTypeLabel(txn.type)}</td>
                    <td className={txn.type === 'deposit' ? 'positive' : 'negative'}>
                      ₹{txn.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "addPayee" && (
        <div className="form-card">
          <h2>Add Payee</h2>
          <form onSubmit={handleAddPayee}>
            <input 
              type="text" 
              placeholder="Customer Name" 
              value={newPayee.customerName}
              onChange={(e) => setNewPayee({...newPayee, customerName: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="Bank Name" 
              value={newPayee.bankName}
              onChange={(e) => setNewPayee({...newPayee, bankName: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="Account Number" 
              value={newPayee.accountNumber}
              onChange={(e) => setNewPayee({...newPayee, accountNumber: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="IFSC Code" 
              value={newPayee.ifscCode}
              onChange={(e) => setNewPayee({...newPayee, ifscCode: e.target.value})}
              required
            />
            <button type="submit" className="btn">Add Payee</button>
            <button className="btn" onClick={() => setView("userDashboard")}>Cancel</button>
          </form>
        </div>
      )}

      {view === "updateProfile" && user && (
        <div className="form-card">
          <h2>Update Profile</h2>
          <form onSubmit={handleUpdateProfile}>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={user.name}
              onChange={(e) => setUser({...user, name: e.target.value})}
              required
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={user.email}
              onChange={(e) => setUser({...user, email: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="Phone" 
              value={user.phone}
              onChange={(e) => setUser({...user, phone: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="Username" 
              value={user.username}
              onChange={(e) => setUser({...user, username: e.target.value})}
              required
            />
            <button type="submit" className="btn">Update Profile</button>
            <button className="btn" onClick={() => setView("userDashboard")}>Cancel</button>
          </form>
        </div>
      )}

      <footer>
        <p>© 2025 SecureBank. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;