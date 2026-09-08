/** PostgREST가 한 응답에 돌려주는 최대 행 수 */
export const POSTGREST_MAX_ROWS = 1000;

type PagedResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * 조회를 끝까지 나눠 읽습니다.
 *
 * PostgREST는 한 응답에 1000행까지만 주고 넘치면 **오류 없이 그냥 자릅니다**.
 * `.limit(5000)` 을 걸어도 1000행만 옵니다. 전체가 필요한 조회는 이 함수로
 * 감싸 주세요.
 *
 * 주의: `buildQuery` 안의 정렬은 **행마다 고유한 값**으로 끝나야 합니다.
 * 값이 같은 행이 있으면 페이지 경계에서 순서가 흔들려 일부가 빠지거나
 * 중복될 수 있습니다. (예: `created_at` 정렬 뒤에 `id` 정렬을 덧붙이기)
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<PagedResult<T>>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await buildQuery(
      offset,
      offset + POSTGREST_MAX_ROWS - 1,
    );

    if (error) return { rows: [], error: error.message };
    if (!data?.length) break;

    rows.push(...data);
    if (data.length < POSTGREST_MAX_ROWS) break;
    offset += POSTGREST_MAX_ROWS;
  }

  return { rows, error: null };
}
