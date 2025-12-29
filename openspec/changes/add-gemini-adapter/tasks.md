## 1. Configuration
- [ ] 1.1 Define and create `src/adapters/gemini-patterns.json`.
- [ ] 1.2 Implement a `PatternLoader` utility to safely load and compile regex from JSON.

## 2. Adapter Implementation
- [ ] 2.1 Implement `GeminiAdapter` using the Transparent Proxy strategy.
- [ ] 2.2 implement state detection logic: Sniff the output buffer against loaded patterns.
- [ ] 2.3 Expose an `onStateChange` event from the adapter.

## 3. Integration
- [ ] 3.1 Verify the adapter with a real `gemini chat` session.
- [ ] 3.2 Add a "Debug Sniffer" mode to log what patterns are matching in real-time.
