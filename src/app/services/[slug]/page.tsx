import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServiceBySlug, services, categoryInfo } from '@/data/services';
import ServicePageClient from './ServicePageClient';

// Generate static paths for all services
export function generateStaticParams() {
    return services.map((service) => ({
        slug: service.slug,
    }));
}

// Generate metadata for each service page
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const service = getServiceBySlug(slug);

    if (!service) {
        return {
            title: 'Service Not Found | Levitate Labs',
        };
    }

    const category = categoryInfo[service.category];

    return {
        title: `${service.name} | ${category.name} | Levitate Labs`,
        description: service.shortDescription,
        openGraph: {
            title: `${service.name} - ${service.price}`,
            description: service.shortDescription,
            type: 'website',
        },
    };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const service = getServiceBySlug(slug);

    if (!service) {
        notFound();
    }

    return <ServicePageClient slug={slug} />;
}
