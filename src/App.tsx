import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Library from './views/Library';
import Reader from './views/Reader';

function App() {
  return (
    <Router>
      <div className="app-container">
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/reader" element={<Reader />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
