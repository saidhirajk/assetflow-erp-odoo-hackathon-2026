import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </div>
      <Card className="p-8 text-center">
        <Construction className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          This module is being built out in the next phase. The database and access rules
          are already in place, so nothing here will be lost.
        </p>
      </Card>
    </div>
  );
}
