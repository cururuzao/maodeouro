import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ApplicationForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log({ name, email });
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-md mx-auto text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 border-2 border-primary rounded-lg flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Trabalhe Conosco</h1>
        <p className="text-muted-foreground mb-8">
          Preencha seus dados para iniciar o processo de cadastro.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-muted-foreground">Nome completo</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              className="h-11"
              required
            />
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
            Prosseguir com a vaga
          </Button>
        </form>
      </div>
    </section>
  );
};

export default ApplicationForm;
