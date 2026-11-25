/** Query keys in one place, so reads and the writes that refresh them always agree. */
export const keys = {
  auth: { me: ['auth', 'me'] },
  notifications: ['notifications'],
  push: { count: ['push', 'count'] },
  storage: ['storage', 'status'],
  privateFile: (path) => ['private-file', path],
  credentialGuide: (item) => ['credential-guide', `${item?.name}:${item?.category || ''}`],
  hub: {
    all: ['hub', 'all'],
    versions: ['hub', 'versions'],
    keys: (list) => ['hub', 'keys', [...list].sort().join('|')],
  },
  preq: {
    projects: ['preq', 'projects'],
    stats: ['preq', 'projects', 'stats'],
    project: (id) => ['preq', 'project', String(id)],
    checklist: (id) => ['preq', 'project', String(id), 'checklist'],
    brd: (id) => ['preq', 'project', String(id), 'brd'],
    certificate: (id) => ['preq', 'project', String(id), 'certificate'],
    context: (id) => ['preq', 'project', String(id), 'context'],
    templates: ['preq', 'templates'],
  },
};
