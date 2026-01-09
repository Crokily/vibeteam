# Design: Session Pruning Logic

## Architecture
The pruning logic will be encapsulated as a static utility within the `SessionManager` class to ensure it runs before new session creation, maintaining the invariant that the number of sessions on disk does not grow unboundedly.

## Detailed Design

### 1. `SessionManager.pruneSessions(baseDir)`
This static private method will:
1.  Resolve the session directory path.
2.  Check if the directory exists; if not, return.
3.  Read all files ending in `.json`.
4.  If `files.length < MAX_SESSIONS`, return.
5.  Map files to `{ path, mtime }` using `fs.statSync`.
6.  Sort files by `mtime` (ascending, oldest first).
7.  Calculate `deleteCount = files.length - MAX_SESSIONS + 1` (to make room for the new one).
8.  Loop `deleteCount` times and `fs.unlinkSync` the oldest files.

### 2. Integration point
- Call `SessionManager.pruneSessions(options.baseDir)` at the beginning of `SessionManager.create()`.

## Constants
- `MAX_SESSIONS = 50`: A reasonable balance between history retention and disk clutter.
