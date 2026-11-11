import { LandingLayout } from "@fusorb/facet-layout";
import { CookieConsent, Footer } from "@fusorb/facet-components";
import { PublicNavbar } from "@/components/public-navbar";
import { ConditionalHero } from "./_components/conditional-hero";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LandingLayout
      nav={<PublicNavbar />}
      hero={<ConditionalHero />}
      footer={<Footer />}
    >
      {children}
      <CookieConsent />
    </LandingLayout>
  );
}
