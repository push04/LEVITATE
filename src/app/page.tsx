import Hero from '@/components/sections/Hero';
import Services from '@/components/sections/Services';
import CaseStudies from '@/components/sections/CaseStudies';
import Team from '@/components/sections/Team';
import Contact from '@/components/sections/Contact';
import AIChatWidget from '@/components/AIChatWidget';

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <CaseStudies />
      <Team />
      <Contact />
      <AIChatWidget />
    </>
  );
}
