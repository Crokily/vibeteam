import { describe, expect, it } from 'vitest';
import { OutputSniffer } from './OutputSniffer';
import { CompiledPattern } from '../PatternLoader';

describe('OutputSniffer', () => {
  const patterns: CompiledPattern[] = [
    {
      name: 'prompt',
      description: 'Waiting for input',
      source: 'Enter command:',
      regex: /Enter command:/,
    },
    {
      name: 'loading',
      source: 'Loading...',
      regex: /Loading\.\.\./,
    },
  ];

  it('detects patterns in chunks', () => {
    const sniffer = new OutputSniffer(patterns);
    
    const result = sniffer.sniff('Please Enter command: now');
    
    expect(result).not.toBeNull();
    expect(result?.newState?.name).toBe('prompt');
    expect(result?.match?.name).toBe('prompt');
  });

  it('handles partial chunks across buffer', () => {
    const sniffer = new OutputSniffer(patterns);
    
    sniffer.sniff('Enter ');
    const result = sniffer.sniff('command:');
    
    expect(result).not.toBeNull();
    expect(result?.newState?.name).toBe('prompt');
  });

  it('returns null when no match', () => {
    const sniffer = new OutputSniffer(patterns);
    const result = sniffer.sniff('Hello World');
    expect(result).toBeNull();
  });

  it('respects buffer size', () => {
    const sniffer = new OutputSniffer(patterns, 10); // Small buffer
    
    sniffer.sniff('1234567890'); // Fill buffer
    sniffer.sniff('12345'); // Rotate
    
    // Buffer should be '6789012345'
    // 'Enter command:' is 14 chars, won't fit if split badly, 
    // but here we just check if it forgot old data
    
    // Let's test a simple overflow case
    // Pattern "ABC"
    const p: CompiledPattern[] = [{ name: 'match', source: 'ABC', regex: /ABC/ }];
    const s = new OutputSniffer(p, 5);
    
    s.sniff('AB');
    s.sniff('XXXXXX'); // 'AB' should be pushed out
    const res = s.sniff('C'); // 'XXXXXXC' -> 'XXXXC' (buffer is 5)
    
    expect(res).toBeNull();
    
    // Retry with sufficient buffer
    s.reset();
    s.sniff('AB');
    const res2 = s.sniff('C'); // 'ABC'
    expect(res2?.newState?.name).toBe('match');
  });
});
