export default function DynaBloomFooter() {
  return (
    <footer style={{
      marginTop:      'auto',
      position:       'relative',
      zIndex:         1,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexWrap:       'wrap',
      gap:            '0.4rem 0.75rem',
      padding:        '1.1rem 1rem',
      color:          'var(--text-3)',
      fontSize:       '0.78rem',
      textAlign:      'center',
      borderTop:      '1px solid var(--border)',
    }}>
      <img
        src="/logoDB.png"
        alt="DynaBloom"
        style={{ width: 26, height: 26, objectFit: 'contain', opacity: 0.9 }}
      />
      <span>
        Hecho por{' '}
        <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>DynaBloom</strong>
        {' '}· Guatemala · 2026
      </span>
      <span style={{ color: 'var(--border)' }}>·</span>
      <a
        href="mailto:dynabloom.gt@gmail.com"
        style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}
      >
        Soporte
      </a>
    </footer>
  )
}
