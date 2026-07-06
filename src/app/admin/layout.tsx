import type { Metadata, Viewport } from "next";
import PwaBootstrap from "@/components/admin/PwaBootstrap";

export const metadata: Metadata = {
    title: "Admin | Levitate Labs",
    description: "Levitate Labs Admin Dashboard",
    manifest: "/admin-manifest.webmanifest",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "LL Admin",
    },
    icons: {
        icon: "/icons/icon-192.png",
        apple: "/icons/apple-touch-icon.png",
    },
};

export const viewport: Viewport = {
    themeColor: "#B08D57",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            <PwaBootstrap />
            {children}
        </div>
    );
}
