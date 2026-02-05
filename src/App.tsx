import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UserMap from './pages/UserMap';
import AdminDashboard from './pages/AdminDashboard';
import { Shield } from 'lucide-react';

const App = () => {
    return (
        <Router>


            <Routes>
                <Route path="/" element={<UserMap />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </Router>
    );
};

export default App;
