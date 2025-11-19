"use client"

export const Sponsors = () => {
  return (
    <section className="container py-24 sm:py-32">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-center mb-8">Trusted by thousands</h2>
        <div className="flex flex-wrap justify-center gap-8 opacity-60">
          {["Company 1", "Company 2", "Company 3", "Company 4"].map((company) => (
            <div key={company} className="text-muted-foreground text-lg">
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

