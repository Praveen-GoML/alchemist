import { useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { norm } from '../utils/helpers';

/**
 * Single source of truth for "which projects may this user see?".
 * - PM / TL / admin: everything.
 * - Everyone else: only the projects ticked on their row in Team > Project matrix.
 * Names are compared with norm() so "Haletale Phase 2" == "Haletale PH2".
 */
export function useProjectScope(members = []) {
  const { user, isManagementUser, isOwnMember } = useAuth();

  const keys = useMemo(() => {
    if (!user || isManagementUser) return null; // null = unrestricted
    const me = (members || []).find(m => isOwnMember(m.name, m.email));
    return new Set((me?.projects || []).map(norm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isManagementUser, members]);

  const canSee = useCallback((name) => keys === null || keys.has(norm(name || '')), [keys]);

  // Looser match for records whose names carry extra text (e.g. PreQ "MovilVentas – Native LLM ...")
  const canSeeAny = useCallback((...names) => {
    if (keys === null) return true;
    const hay = names.filter(Boolean).map(norm);
    return [...keys].some(k => k && hay.some(h => h === k || h.startsWith(k)));
  }, [keys]);

  return { restricted: keys !== null, canSee, canSeeAny };
}
