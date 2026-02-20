interface Props {
  current: number;
  total: number;
  message?: string;
}

export default function TranslationProgress({ current, total, message }: Props) {
  const percentage = total === 0 ? 0 : Math.round((current / total) * 100);

  return (
    <div className="card-brutal" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#e2f1f8' }}>
      <h3 style={{ marginBottom: '10px' }}>Traduzindo frases...</h3>
      {message && <p style={{ marginBottom: '15px' }}>{message}</p>}
      
      <div style={{ width: '100%', height: '30px', border: '3px solid black', backgroundColor: 'white', position: 'relative' }}>
        <div 
          style={{ 
            width: `${percentage}%`, 
            height: '100%', 
            backgroundColor: '#00e676', 
            transition: 'width 0.3s ease' 
          }} 
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          {percentage}% ({current}/{total})
        </div>
      </div>
      <p style={{ marginTop: '10px', fontSize: '0.8rem', fontStyle: 'italic' }}>Pode levar alguns segundos.</p>
    </div>
  );
}
