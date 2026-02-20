interface Props {
  original: string;
  translated?: string;
}

export default function SentencePair({ original, translated }: Props) {
  return (
    <div className="card-brutal" style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{original}</div>
      {translated && (
        <div style={{ color: '#555', borderTop: '2px dashed #ccc', paddingTop: '10px' }}>
          {translated}
        </div>
      )}
    </div>
  );
}
