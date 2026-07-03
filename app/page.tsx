import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import HowItWorks from "./components/HowItWorks";
import NetworkSection from "./components/NetworkSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh" }}>
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <NetworkSection />
      <Footer />
    </main>
  );
}