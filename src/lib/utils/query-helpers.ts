/**
 * Shared Supabase query helpers.
 * Centralizes repeated filter patterns so they are defined once.
 */

/**
 * Applies the standard prop account filter to any Supabase query builder.
 *
 * - `undefined` or `null` → no filter (all accounts)
 * - `'unassigned'` → only trades with no prop_account_id
 * - any UUID string → only trades matching that account
 *
 * @example
 * let query = supabase.from('trades').select('...').eq('status', 'closed')
 * query = withPropAccountFilter(query, propAccountId)
 */
export function withPropAccountFilter<
  Q extends {
    is: (column: string, value: null) => Q;
    eq: (column: string, value: string) => Q;
  },
>(query: Q, propAccountId?: string | null): Q {
  if (propAccountId === 'unassigned') {
    return query.is('prop_account_id', null);
  }
  if (propAccountId) {
    return query.eq('prop_account_id', propAccountId);
  }
  return query;
}
