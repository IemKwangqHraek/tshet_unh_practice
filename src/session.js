// Pure session state machine; time is injected so pause/resume and results are reproducible.
export function createSession(tokens, variant = 'three', settings = {}, now = 0) {
  if (!tokens.length) throw new Error('沒有可練習的字');
  return { tokens, variant, settings: { ...settings }, settingsChanges: [], cursor: 0, buffer: '', wrong: false,
    correct: 0, attempts: 0, errors: [], elapsed: 0, runningSince: null, paused: false, finished: false, createdAt: now };
}

export function elapsedMs(session, now) {
  return session.elapsed + (session.runningSince === null ? 0 : Math.max(0, now - session.runningSince));
}

export function pause(session, now) {
  session.elapsed = elapsedMs(session, now);
  session.runningSince = null;
  session.paused = true;
}

export function resume(session, now) {
  if (session.finished) return;
  session.paused = false;
  // Explicit resume starts the clock, even before the first subsequent letter.
  session.runningSince = now;
}

function fullStage(reading, offset) {
  // Collapsed letters in the scheme can cross segment boundaries; use the surviving prefix length.
  const firstEnd = reading.parts[0].length;
  const secondEnd = reading.full.length - reading.parts[2].length;
  return offset < firstEnd ? 0 : offset < secondEnd ? 1 : 2;
}

export function inputKey(session, key, now) {
  if (session.finished) return 'finished';
  if (key === 'Escape') { session.paused ? resume(session, now) : pause(session, now); return 'pause'; }
  if (session.paused) return 'paused';
  if (key === 'Backspace') {
    session.buffer = session.buffer.slice(0, -1);
    session.wrong = false;
    return 'backspace';
  }
  const reading = session.tokens[session.cursor];
  const expected = session.variant === 'three' ? reading.triple : reading.full;
  if (key === ' ' && session.variant === 'full') {
    if (session.wrong) return 'blocked';
    if (session.buffer !== expected) return 'incomplete';
    complete(session, now);
    return session.finished ? 'finished' : 'complete';
  }
  if (!/^[a-z]$/i.test(key)) return 'ignored';
  if (session.wrong) return 'blocked';
  if (session.variant === 'full' && session.buffer === expected) return 'confirm';
  if (session.runningSince === null) session.runningSince = now;
  const letter = session.variant === 'three' ? key.toUpperCase() : key.toLowerCase();
  const stage = session.variant === 'three' ? session.buffer.length : fullStage(reading, session.buffer.length);
  session.attempts++;
  if (expected[session.buffer.length] !== letter) {
    session.errors.push({ cursor: session.cursor, char: reading.char, position: reading.position,
      stage, expected: expected[session.buffer.length], actual: letter, offset: session.buffer.length });
    session.buffer += letter;
    session.wrong = true;
    return 'wrong';
  }
  session.correct++;
  session.buffer += letter;
  if (session.variant === 'three' && session.buffer.length === 3) {
    complete(session, now);
    return session.finished ? 'finished' : 'complete';
  }
  return 'correct';
}

function complete(session, now) {
  session.cursor++;
  session.buffer = '';
  session.wrong = false;
  if (session.cursor === session.tokens.length) {
    session.elapsed = elapsedMs(session, now);
    session.runningSince = null;
    session.finished = true;
  }
}

export function sessionStats(session, now) {
  const ms = elapsedMs(session, now);
  return { milliseconds: ms, completed: session.cursor, total: session.tokens.length,
    accuracy: session.attempts ? session.correct / session.attempts * 100 : 100,
    speed: ms > 0 ? Math.round(session.cursor / (ms / 60000)) : 0,
    stageErrors: [0, 1, 2].map(stage => session.errors.filter(e => e.stage === stage).length) };
}

export function mistakeTokens(session) {
  const seen = new Set();
  return session.errors.flatMap(error => {
    const token = session.tokens[error.cursor];
    const key = `${token.char}:${token.position}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [token];
  });
}
