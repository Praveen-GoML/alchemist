/**
 * Promise-based replacement for window.alert / window.confirm.
 *
 *   await dialog.alert('Saved', { variant: 'success' });
 *   if (await dialog.confirm('Delete X?', { variant: 'danger', confirmLabel: 'Delete' })) { ... }
 *
 * <DialogHost /> (mounted once in main.jsx) renders them as a modal with an illustration.
 */
const listeners = new Set();

function open(spec) {
  return new Promise(resolve => {
    const item = { id: Math.random().toString(36).slice(2), resolve, ...spec };
    if (listeners.size === 0) {
      // Host not mounted yet: fall back to the browser so nothing is silently lost.
      resolve(spec.kind === 'confirm' ? window.confirm(spec.message) : (window.__nativeAlert?.(spec.message), true));
      return;
    }
    listeners.forEach(fn => fn(item));
  });
}

export const dialog = {
  alert: (message, opts = {}) => open({ kind: 'alert', message: String(message ?? ''), ...opts }),
  confirm: (message, opts = {}) => open({ kind: 'confirm', message: String(message ?? ''), ...opts }),
  _subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** Pick an illustration and title from the wording when the caller doesn't say. */
export function describe(spec) {
  const m = spec.message || '';
  let variant = spec.variant;
  if (!variant) {
    if (spec.kind === 'confirm') variant = /delete|remove|clear|replace/i.test(m) ? 'danger' : 'question';
    else if (/^\s*(✅|done|saved|complete)/i.test(m)) variant = 'success';
    else if (/^\s*(⚠️|❌)|failed|could not|error|invalid|isn'?t/i.test(m)) variant = 'error';
    else if (/only|locked|not allowed|permission|can only/i.test(m)) variant = 'lock';
    else variant = 'info';
  }
  const titles = {
    success: 'All done',
    error: 'Something went wrong',
    lock: 'Not allowed',
    danger: 'Are you sure?',
    question: 'Please confirm',
    info: 'Heads up',
  };
  return {
    variant,
    title: spec.title || titles[variant],
    message: m.replace(/^\s*(✅|⚠️|❌)\s*/, ''),
  };
}
