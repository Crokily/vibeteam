## 1. Configuration
- [x] 1.1 Define and create `src/adapters/gemini-patterns.json`.
- [x] 1.2 Implement a `PatternLoader` utility to safely load and compile regex from JSON.

## 2. Adapter Implementation
- [x] 2.1 Implement `GeminiAdapter` using the Transparent Proxy strategy.
- [x] 2.2 implement state detection logic: Sniff the output buffer against loaded patterns.
- [x] 2.3 Expose an `onStateChange` event from the adapter.

## 3. Integration
- [x] 3.1 Verify the adapter with a real `gemini chat` session.
- [x] 3.2 Add a "Debug Sniffer" mode to log what patterns are matching in real-time.