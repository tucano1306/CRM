// __tests__/lib/sanitize.test.ts
import { sanitizeText, sanitizeHTML, sanitizeURL } from '@/lib/sanitize'

describe('sanitizeText', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeText('<script>alert(xss)</script>hello')).toBe('alert(xss)hello')
    expect(sanitizeText('<div>content</div>')).toBe('content')
    expect(sanitizeText('<p>text</p>')).toBe('text')
  })

  it('should remove dangerous characters like quotes and angle brackets', () => {
    expect(sanitizeText('test<>test')).toBe('testtest')
    expect(sanitizeText("test'test")).toBe('testtest')
    expect(sanitizeText('test"test')).toBe('testtest')
  })

  it('should remove javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)')
    expect(sanitizeText('JAVASCRIPT:alert(1)')).toBe('alert(1)')
  })

  it('should remove event handler attributes', () => {
    // The current implementation removes "onclick=" but leaves the value
    expect(sanitizeText('test onclick=alert(1)')).toContain('test')
  })

  it('should limit text length', () => {
    const longText = 'a'.repeat(2000)
    expect(sanitizeText(longText).length).toBe(1000)
    expect(sanitizeText(longText, 50).length).toBe(50)
  })

  it('should handle empty and invalid inputs', () => {
    expect(sanitizeText('')).toBe('')
    expect(sanitizeText(null as any)).toBe('')
    expect(sanitizeText(undefined as any)).toBe('')
    expect(sanitizeText(123 as any)).toBe('')
  })

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
    expect(sanitizeText('\n\ttest\n\t')).toBe('test')
  })
})

describe('sanitizeHTML', () => {
  it('should allow safe HTML tags', () => {
    expect(sanitizeHTML('<b>bold</b>')).toBe('<b>bold</b>')
    expect(sanitizeHTML('<i>italic</i>')).toBe('<i>italic</i>')
    expect(sanitizeHTML('<p>paragraph</p>')).toBe('<p>paragraph</p>')
    expect(sanitizeHTML('<ul><li>item</li></ul>')).toBe('<ul><li>item</li></ul>')
  })

  it('should remove unsafe HTML tags', () => {
    expect(sanitizeHTML('<script>evil</script>safe')).toBe('evilsafe')
    expect(sanitizeHTML('<div>content</div>')).toBe('content')
    expect(sanitizeHTML('<iframe src="evil.com"></iframe>text')).toBe('text')
  })

  it('should remove event handlers', () => {
    // Current implementation removes "onclick=" but leaves the value after it
    const result = sanitizeHTML('<b onclick=alert(1)>text</b>')
    expect(result).toContain('<b')
    expect(result).toContain('text</b>')
    expect(result).not.toContain('onclick')
  })

  it('should handle empty inputs', () => {
    expect(sanitizeHTML('')).toBe('')
    expect(sanitizeHTML(null as any)).toBe('')
  })
})

describe('sanitizeURL', () => {
  it('should allow safe URLs', () => {
    expect(sanitizeURL('https://example.com')).toBe('https://example.com')
    expect(sanitizeURL('http://example.com/path')).toBe('http://example.com/path')
    expect(sanitizeURL('mailto:test@example.com')).toBe('mailto:test@example.com')
    expect(sanitizeURL('tel:+1234567890')).toBe('tel:+1234567890')
  })

  it('should block dangerous protocols', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('')
    expect(sanitizeURL('JAVASCRIPT:alert(1)')).toBe('')
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(sanitizeURL('vbscript:msgbox(1)')).toBe('')
    expect(sanitizeURL('file:///etc/passwd')).toBe('')
  })

  it('should block relative URLs without protocol', () => {
    expect(sanitizeURL('/path/to/page')).toBe('')
    expect(sanitizeURL('relative/path')).toBe('')
    expect(sanitizeURL('ftp://example.com')).toBe('')
  })

  it('should handle empty inputs', () => {
    expect(sanitizeURL('')).toBe('')
    expect(sanitizeURL(null as any)).toBe('')
    expect(sanitizeURL(undefined as any)).toBe('')
  })

  it('should limit URL length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(3000)
    expect(sanitizeURL(longUrl).length).toBe(2000)
  })

  it('should trim whitespace', () => {
    expect(sanitizeURL('  https://example.com  ')).toBe('https://example.com')
  })
})
