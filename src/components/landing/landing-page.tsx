import { LandingBenefits } from "./landing-benefits";
import { LandingCta } from "./landing-cta";
import { LandingFaq } from "./landing-faq";
import { LandingFooter } from "./landing-footer";
import { LandingHero } from "./landing-hero";
import { LandingHowItWorks } from "./landing-how-it-works";
import { LandingIntegrations } from "./landing-integrations";
import { LandingLogiq } from "./landing-logiq";
import { LandingNav } from "./landing-nav";
import { LandingProblem } from "./landing-problem";
import { LandingSocialProof } from "./landing-social-proof";
import { LandingSolution } from "./landing-solution";
import "./landing-tokens.css";

export function LandingPage() {
  return (
    <div className="landing min-h-svh">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingSocialProof />
        <LandingProblem />
        <LandingSolution />
        <LandingLogiq />
        <LandingHowItWorks />
        <LandingBenefits />
        <LandingIntegrations />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
