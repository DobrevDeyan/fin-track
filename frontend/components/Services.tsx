"use client"

export const Services = () => {
  return (
    <section id="services" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Our <span className="bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">Services</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Transaction Tracking</h3>
          <p className="text-muted-foreground">Track all your income and expenses in one place</p>
        </div>
        <div className="text-center p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Budget Planning</h3>
          <p className="text-muted-foreground">Create and manage budgets for different categories</p>
        </div>
        <div className="text-center p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Financial Reports</h3>
          <p className="text-muted-foreground">Generate detailed reports and insights</p>
        </div>
      </div>
    </section>
  );
};

