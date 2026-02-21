interface Props {
  current: number;
  total: number;
  message?: string;
}

export default function TranslationProgress({ current, total, message }: Props) {
  const percentage = total === 0 ? 0 : Math.round((current / total) * 100);

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3 style={{ marginBottom: '8px', color: 'var(--color-text)', fontWeight: '600', fontSize: '1.1rem' }}>Traduzindo frases...</h3>
      {message && <p style={{ marginBottom: '24px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{message}</p>}
      
      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-divider)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
        <div 
          style={{ 
            width: `${percentage}%`, 
            height: '100%', 
            backgroundColor: 'var(--color-primary)', 
            transition: 'width 0.3s ease' 
          }} 
        />
      </div>
      <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
        {percentage}% ({current}/{total})
      </div>
      <p style={{ marginTop: '8px', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>Processando lote.</p>
    </div>
  );
}
