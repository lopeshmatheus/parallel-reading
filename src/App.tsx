import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Library from './views/Library';
import Reader from './views/Reader';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1 className="title-brutal">Leitor Paralelo</h1>
        </header>
        <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
