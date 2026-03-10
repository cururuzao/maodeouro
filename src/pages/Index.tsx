import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import ApplicationForm from "@/components/ApplicationForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroBanner />
      <ApplicationForm />
    </div>
  );
};

export default Index;
