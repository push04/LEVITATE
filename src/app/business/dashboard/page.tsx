import BusinessDashboardClient from '@/components/business/BusinessDashboardClient';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function BusinessDashboardPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const params = (searchParams ? await searchParams : {}) as SearchParams;
    const onboardValue = params.onboard;
    const onboardingSuccess = Array.isArray(onboardValue)
        ? onboardValue.includes('success')
        : onboardValue === 'success';

    return <BusinessDashboardClient onboardingSuccess={onboardingSuccess} />;
}


