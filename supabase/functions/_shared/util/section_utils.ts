import { Database } from "../database.types.ts";
import { ISection, ITopic } from "../models/internal/ISection.ts";

export function buildNestedSections(sections: Database["public"]["Tables"]["section"]["Row"][]): ISection[] {
  const topLevelSections: ISection[] = [];

  const sectionMap = new Map<string, ISection>();
  sections.forEach((section) => {
    const nestedSection = mapSectionToNestedSection(section);
    sectionMap.set(nestedSection.path, nestedSection);
  });

  sections.forEach((section) => {
    const parentPath = section.path.substring(0, section.path.lastIndexOf("."));
    const parent = sectionMap.get(parentPath);
    if (parent) {
      if (!parent.subsections) {
        parent.subsections = [];
      }
      parent.subsections.push(mapSectionToNestedSection(section));
    } else {
      topLevelSections.push(mapSectionToNestedSection(section));
    }
  });

  return topLevelSections;
}

function mapSectionToNestedSection(section: Database["public"]["Tables"]["section"]["Row"]): ISection {
  const nestedSection: ISection = {
    id: section.id,
    title: section.title,
    description: section.description,
    dates: section.dates ?? undefined,
    path: section.path,
    subsections: [],
  };

  return nestedSection;
}
