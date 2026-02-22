import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Library from './views/Library';
import Reader from './views/Reader';
import { AuthProvider } from './components/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './views/Login';
import { Register } from './views/Register';
import { ReloadPrompt } from './components/ReloadPrompt';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container min-h-screen">
          <ReloadPrompt />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route 
                path="/library" 
                element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reader" 
                element={
                  <ProtectedRoute>
                    <Reader />
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirect root to library */}
              <Route path="/" element={<Navigate to="/library" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
