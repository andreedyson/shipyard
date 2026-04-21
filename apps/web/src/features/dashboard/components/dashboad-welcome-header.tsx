"use client";

type DashboardWelcomeHeaderProps = {
  title?: string;
  subTitle?: string;
};

function DashboardWelcomeHeader({
  title = "Welcome back, Web Developer 🙋‍♂️",
  subTitle = "Organize all the system data in one centralized dashboard.",
}: DashboardWelcomeHeaderProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
      <p className="text-muted-foreground text-sm">{subTitle}</p>
    </div>
  );
}

export default DashboardWelcomeHeader;
