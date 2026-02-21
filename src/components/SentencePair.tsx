interface Props {
  original: string;
  translated?: string;
}

export default function SentencePair({ original, translated }: Props) {
  return (
    <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'row', gap: '64px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, fontSize: '1.25rem', lineHeight: '1.6', color: 'var(--color-text)', fontWeight: '500' }}>
        {original}
      </div>
      <div style={{ flex: 1 }}>
        {translated && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', lineHeight: '1.6', fontWeight: 400 }}>
            {translated}
          </div>
        )}
      </div>
    </div>
  );
}
