import JsonLd from '@/components/ui/JsonLd';

interface FeatureRow {
    feature: string;
    us: string;
    lev: string;
    usOk?: boolean;
    levOk?: boolean;
}

interface PlatformConfig {
    name: string;
    color: string;
    features: FeatureRow[];
}

interface ComparisonTableProps {
    platformA: PlatformConfig;
    platformB: PlatformConfig;
    intro?: string;
}

export default function ComparisonTable({ platformA, platformB, intro }: ComparisonTableProps) {
    const allFeatures = platformA.features.map((f, i) => ({
        feature: f.feature,
        [platformA.name]: f.us,
        [platformB.name]: platformB.features[i]?.lev || '',
        usOk: f.usOk,
        levOk: platformB.features[i]?.levOk,
    }));

    return (
        <div className="overflow-x-auto rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
            {intro && (
                <p className="px-6 pt-6 pb-2 text-sm text-[var(--text-secondary)]">{intro}</p>
            )}
            <table className="w-full min-w-[600px] text-sm">
                <thead>
                    <tr className="border-b border-[var(--border-default)]">
                        <th className="px-4 py-3 text-left font-medium">Feature</th>
                        <th className="px-4 py-3 text-center text-[var(--text-tertiary)]">{platformA.name}</th>
                        <th className="px-4 py-3 text-center text-[var(--gold-base)]">{platformB.name}</th>
                    </tr>
                </thead>
                <tbody>
                    {allFeatures.map((row, idx) => (
                        <tr key={row.feature} className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 0 ? 'bg-[var(--bg-base)]/50' : ''}`}>
                            <td className="px-4 py-3 font-medium">{row.feature}</td>
                            <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                                <span className={row.usOk === false ? 'text-red-400' : row.usOk ? 'text-green-400' : ''}>
                                    {String(row[platformA.name])}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                                <span className={row.levOk === false ? 'text-red-400' : row.levOk ? 'text-green-400' : ''}>
                                    {String(row[platformB.name])}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function generateComparisonSchema(platformA: string, platformB: string, features: string[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CompareAction',
        object: {
            '@type': 'SoftwareApplication',
            name: platformA,
        },
        targetCollection: {
            '@type': 'SoftwareApplication',
            name: platformB,
        },
        actionStatus: 'https://schema.org/CompletedActionStatus',
    };
}
