"use client"

export const About = () => {
  return (
    <section id="about" className="container py-24 sm:py-32">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            About <span className="text-foreground">FinTrack</span>
          </h2>
          <p className="text-muted-foreground text-xl mt-4 mb-8">
            FinTrack is a modern financial management platform designed to help you take control of your finances. 
            With manual expense tracking, real-time analytics, and intuitive budgeting tools, managing your money has never been easier.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="w-full max-w-md h-64 bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">Visual content placeholder</span>
          </div>
        </div>
      </div>
    </section>
  );
};

