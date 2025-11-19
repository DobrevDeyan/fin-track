"use client"

export const Team = () => {
  return (
    <section id="team" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Our <span className="bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">Team</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {["Alex Chen", "Sarah Johnson", "Mike Davis"].map((name) => (
          <div key={name} className="text-center">
            <div className="w-32 h-32 rounded-full bg-muted mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold">{name}</h3>
            <p className="text-muted-foreground">Team Member</p>
          </div>
        ))}
      </div>
    </section>
  );
};

