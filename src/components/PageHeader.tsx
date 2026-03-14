const PageHeader = ({ title, titleAccent, subtitle }: { title: string; titleAccent: string; subtitle: string }) => (
  <section className="gradient-header-page py-16 md:py-20 text-center">
    <div className="container">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        {title} <span className="text-primary">{titleAccent}</span>
      </h1>
      <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
    </div>
  </section>
);

export default PageHeader;
