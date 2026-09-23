type SessionEvent = 'signedIn' | 'signedOut';
type Listener = (event: SessionEvent) => void;

const listeners = new Set<Listener>();

/**
 * Tiny pub/sub so modules that must react to sign-in/out (query cache, push registration)
 * do not need to import the auth store, and vice versa.
 */
export const sessionEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(event: SessionEvent): void {
    listeners.forEach(listener => listener(event));
  },
};
