import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import DashboardNavBar from './NavBar/DashboardNavBar';
import Profile from './pages/Profile';
import GitLab from './pages/GitLab';


function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<DashboardNavBar><Dashboard /></DashboardNavBar>} />
      <Route path="/team" element={<DashboardNavBar><Team /></DashboardNavBar>} />
      <Route path="/tasks" element={<DashboardNavBar><Tasks /></DashboardNavBar>} />
      <Route path="/profile" element={<DashboardNavBar><Profile /></DashboardNavBar>} />
      <Route path="/gitlab" element={<DashboardNavBar><GitLab /></DashboardNavBar>}/>
    </Routes>
  );
}

export default App;