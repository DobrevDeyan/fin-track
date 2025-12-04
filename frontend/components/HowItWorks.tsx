"use client"

export const HowItWorks = () => {
  const steps = [
    { number: "1", title: "Sign Up", description: "Create your free account in seconds" },
    { number: "2", title: "Add Expenses", description: "Manually enter your income and expenses" },
    { number: "3", title: "Connect", description: "Link your bank accounts securely" },
    { number: "4", title: "Track", description: "Watch AI automatically categorize your transactions" },
    { number: "5", title: "Categorize", description: "Organize your entries by category for better tracking" },
    { number: "6", title: "Analyze", description: "Get insights and optimize your spending" },
  ];

  return (
    <section id="how-it-works" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        How It <span className="bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">Works</span>
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step) => (
          <div key={step.number} className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">{step.number}</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

