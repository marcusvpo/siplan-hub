import { ProjectV2 } from "@/types/ProjectV2";
import { Accordion } from "@/components/ui/accordion";
import { InfraCard } from "./stages/InfraCard";
import { AdherenceCard } from "./stages/AdherenceCard";
import { EnvironmentCard } from "./stages/EnvironmentCard";
import { ConversionCard } from "./stages/ConversionCard";
import { ImplementationCard } from "./stages/ImplementationCard";
import { PostCard } from "./stages/PostCard";

interface StageCardsProps {
  project: ProjectV2;
}

export const StageCards = ({ project }: StageCardsProps) => {
  return (
    <Accordion type="multiple" className="space-y-4">
      <InfraCard project={project} />
      <AdherenceCard project={project} />
      <EnvironmentCard project={project} />
      <ConversionCard project={project} />
      <ImplementationCard project={project} />
      <PostCard project={project} />
    </Accordion>
  );
};
