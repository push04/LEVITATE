import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CompanyLoginAliasPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (searchParams ? await searchParams : {}) as SearchParams;
  const nextParam = params.next;
  const nextValue = Array.isArray(nextParam) ? nextParam[0] : nextParam;
  const query = nextValue ? `?next=${encodeURIComponent(nextValue)}` : '';

  redirect(`/business/login${query}`);
}
